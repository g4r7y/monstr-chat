
import { generateSecretKey, getPublicKey, Event } from '@nostr/tools'

import { nsecEncode, npubEncode, decode } from '@nostr/tools/nip19'

import { red, green, yellow } from '@std/fmt/colors'

import { sendDm } from './nostrSendDm.js'
import { receiveDms } from './nostrReceiveDm.js'
import { publishRelayListMetadata, subscribeToRelayListMetadata, getRelayListMetadata, extractReadRelaysFromNip65 } from './nostrRelayMetadata.js'
import ChatUi from './chatUi.js'
import { ChatModel, ChatMessage, ChatContact } from './chatModel.js'
import { readKey, writeKey } from './localStore.js'
import { stringIsValidNpub } from './validation.js'
import { SimplePool } from '@nostr/tools'
import { normalizeURL } from '@nostr/tools/utils'


class ChatController {
  #npub: string
  #nsec: Uint8Array
  #model: ChatModel
  #ui: ChatUi
  #pool: SimplePool

  constructor() {
    this.#npub = ''
    this.#nsec = new Uint8Array()

    this.#model = new ChatModel()
    this.#ui = new ChatUi(this, this.#model)
    
    const poolOptions = { enablePing: true, enableReconnect: true }
    this.#pool = new SimplePool(poolOptions)
  }

  async run() {
    // try and read key from store
    let nsecStr = await readKey()
    if (nsecStr) {
      const decoded = decode(nsecStr)
      if (decoded.type === 'nsec' && decoded.data) {
        this.#nsec = decoded.data as Uint8Array
      }
    }

    if (this.#nsec.length == 0) {
      console.log('No existing key. Generating a new private key...')
      this.#nsec = generateSecretKey()
      await writeKey(nsecEncode(this.#nsec ))
    }
    
    this.#npub = getPublicKey(this.#nsec)
    
    console.log(yellow('npub: ' + npubEncode(this.#npub)))

  
    await this.#model.load()
    
    let startupError = false

    try {
      await this.subscribeToIncomingDms()
      await this.subscribeToContactRelayMetadata()
      await this.broadcastRelayList()
    } catch (err) {
      startupError = true
    }

    const connError = (this.checkConnectedRelays(this.#model.settings.generalRelays).length === 0) ||
                      (this.checkConnectedRelays(this.#model.settings.inboxRelays).length === 0)
    if (startupError || connError) {
      await this.#ui.go('offline')
    } else {
      await this.#ui.go()
    }

    this.#pool.destroy()
  }

  // Send DM using the recipient's inbox relay(s)
  async sendDm(recipient: ChatContact, text: string) {
    const recipientPubKey = decode(recipient.npub).data as string

    if (!recipient?.relays?.length) {
      console.log(`Cannot send, contact ${recipient.npub} desn't have relay defined`)
      // TODO try the unknown path?
      throw new Error('NoRelay')
    }

    const sentMsg = await sendDm(this.#npub, this.#nsec, recipientPubKey, this.#pool, recipient.relays, text)
    await this.#model.setMessage(sentMsg.id, sentMsg)
  }

  // Send DM to an unknown contact.
  // First tries to fetch the recipient's relay(s) from NIP65, 
  // then sends DM using the recipient's inbox relay(s).
  // Throws if no read relays can be found.
  async sendDmToUnknown(recipientNpub: string, text: string) {
    const recipientPubKey = decode(recipientNpub).data as string
    
    const event = await getRelayListMetadata(recipientPubKey, this.#pool, this.#model.settings.generalRelays)
    if (!event) {
      throw new Error('NoRelay');
    }
    const recipientRelays = extractReadRelaysFromNip65(event)
    console.log('recipeint relays', recipientRelays)
    if (!recipientRelays?.length) {
      throw new Error('NoRelay')
    }
    const sentMsg = await sendDm(this.#npub, this.#nsec, recipientPubKey, this.#pool, recipientRelays, text)
    await this.#model.setMessage(sentMsg.id, sentMsg)
  }

  // Subscribe/re-subscribe to receive DMs from inbox relays
  async subscribeToIncomingDms() {
    await receiveDms(this.#npub, this.#nsec, 
      this.#pool, this.#model.settings.inboxRelays, 
      (msg: ChatMessage) => this.#onIncoming(msg))
  }

  // Subscribe/re-subscribe to receive relaylist metadata for all of our contacts.
  // General (aka discovery) relays are used for the subscription
  async subscribeToContactRelayMetadata() {
    const npubs = this.#model.getContactList()
      .map(c => c.npub)
      .filter(npub => stringIsValidNpub(npub))
      .map(npub => decode(npub).data as string)
    console.log(`Subscribing to relay metadata for contacts: ${this.#model.getContactList().map(c=>c.name)}`)
    await subscribeToRelayListMetadata(npubs, this.#pool, 
      this.#model.settings.generalRelays, 
      async (ev: Event) => this.#onRelaylistMetadata(ev)
    )
  }

  // Broadcast our inbox relay list to the general discovery relays so that other people know how to send message to us
  // Throws if cannot broadcast to any relays
  async broadcastRelayList() {
    await publishRelayListMetadata(this.#npub, this.#nsec,
      this.#pool, this.#model.settings.generalRelays, 
      this.#model.settings.inboxRelays)
  }

  // Checks that the specified relay URLs are connected.
  // @param  relayUrls Subset of relays in the pool that we want to check
  // @return List of relay urls that are in the pool and connected
  checkConnectedRelays(relayUrls: string[]) : string[] {
    const allRelays = this.#pool.listConnectionStatus()
    let result : string[] = []
    relayUrls.forEach(r => {
      const url = normalizeURL(r)
      if (allRelays.has(url) && allRelays.get(url)===true) { 
        result.push(r)
      }
    })
    return result
  }

  getPubKeyString() : string {
    return npubEncode(this.#npub)
  }

  getSecretKeyString() : string {
    return nsecEncode(this.#nsec)
  }


  
  // Callback for incoming DM subscription.
  #onIncoming(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      this.#model.setMessage(msg.id, msg) //todo async
      this.#ui.newMessage(msg)
    }
  }

  // Callback for NIP65 relay list subscription.
  // Called whenever a subscribed npubs's relaylist changes.
  // Checks if we have a corresponding contact and updates its relaylist.
  // Only do this if created_at time is newer than last update as we will get duplicate events
  // from multiple relay.
  #onRelaylistMetadata(ev: Event) {
    console.log('onRelaylistMetadata')
    const contact = this.#model.getContactByNpub(npubEncode(ev.pubkey))
    // update contact if event time is newer (in case there are duplicate events from several relays)
    if (contact && (!contact.relaysUpdatedAt || contact.relaysUpdatedAt < ev.created_at)) {
      const relays: string[] = ev.tags
        .filter((tag :string[]) => tag.length==3 && tag[0]==='r' && tag[2]==='read')
        .map((tag: string[]) => tag[1])
      
      contact.relays = relays
      contact.relaysUpdatedAt = ev.created_at
      console.log(`Updating relaylist for contact: ${contact.name}`) 
      this.#model.setContact(contact) // TODO async
    }
  }

}

export default ChatController