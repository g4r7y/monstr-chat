
import { generateSecretKey, getPublicKey, Event } from '@nostr/tools'

import { nsecEncode, npubEncode, decode } from '@nostr/tools/nip19'
import { Relay } from '@nostr/tools/relay'

import { red, green, yellow } from '@std/fmt/colors'

import { subscribeToIncomingDms, sendDm } from './nostrDm.js'
import { publishRelayListMetadata, subscribeToRelayListMetadata } from './nostrRelayMetadata.js'
import ChatUi from './chatUi.js'
import { ChatModel, ChatMessage, ChatContact } from './chatModel.js'
import { readKey, writeKey } from './localStore.js'
import { stringIsValidNpub } from './validation.js'


class ChatController {
  #npub: string
  #nsec: Uint8Array
  #model: ChatModel
  #ui: ChatUi
  #connectedInboxRelays : Relay[]
  #connectedGeneralRelays : Relay[]

  constructor() {
    this.#npub = ''
    this.#nsec = new Uint8Array()

    this.#model = new ChatModel()
    this.#ui = new ChatUi(this, this.#model)
    this.#connectedInboxRelays = []
    this.#connectedGeneralRelays = []
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
    
    
    console.log(`Connecting to inbox relays`)
    this.#connectedInboxRelays = await this.#connectToRelays(this.#model.settings.inboxRelays)
    console.log(`Connecting to discovery relays`)
    this.#connectedGeneralRelays = await this.#connectToRelays(this.#model.settings.generalRelays)
    
    
    // subscribe to receive DMs from inbox relays
    for (let i = 0; i < this.#connectedInboxRelays.length; i++) {
      console.log(`Subscribing to incoming DMs from relay: ${this.#connectedInboxRelays[i].url}`)
      await subscribeToIncomingDms(this.#npub, this.#nsec, this.#connectedInboxRelays[i], 
        (msg: ChatMessage) => this.#onIncoming(msg))
      
    }
    
    this.subscribeToRelayLists()
    
    // wait
    const sleep = (ms: number) => {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    }
    await sleep(100)

    this.broadcastRelayList()
  

    const connError = this.#connectedInboxRelays.length === 0 || this.#connectedGeneralRelays.length === 0
    if (connError) {
      await this.#ui.go('offline')
    } else {
      await this.#ui.go()
    }
    
    this.#connectedInboxRelays.forEach(relay => relay.close())
  }

  async sendDm(recipient: ChatContact, text: string) {
    const recipientPubKey = decode(recipient.npub).data as string

    const sentMsg = await sendDm(this.#npub, this.#nsec, recipientPubKey, recipient.relays, text)
    if (sentMsg) {
      await this.#model.setMessage(sentMsg.id, sentMsg)
    }
  }

  // Subscribe/re-subscribe to receive relaylist metadata for all of our contacts.
  // Subscription is applied to the general (discovery) relays
  async subscribeToRelayLists() {
    const npubs = this.#model.getContactList()
      .map(c => c.npub)
      .filter(npub => stringIsValidNpub(npub))
      .map(npub => decode(npub).data as string)
    console.log(`Subscribing to relay metadata for contacts: ${this.#model.getContactList().map(c=>c.name)}`)
    await subscribeToRelayListMetadata(npubs, this.#model.settings.generalRelays, 
      (ev: Event) => this.#onRelaylistMetadata(ev))
  }

  // Broadcast our inbox relay list to the general discovery relays so that other people know how to send message to us
  async broadcastRelayList() {
    //todo catch errors?
    await publishRelayListMetadata(this.#npub, this.#nsec, 
      this.#model.settings.generalRelays, 
      this.#model.settings.inboxRelays)
  }

  getPubKeyString() : string {
    return npubEncode(this.#npub)
  }

  getSecretKeyString() : string {
    return nsecEncode(this.#nsec)
  }

  async #connectToRelays(relayUrls: string[]) : Promise<Relay[]> {
    let connectedRelays = []
    for (let relayUrl of relayUrls) {
      try {
        const relay = await Relay.connect(relayUrl)
        connectedRelays.push(relay)
        console.log(`connected to ${relay.url}`)
      
      } catch (err) {
        console.log(`Failed to connect to relay ${relayUrl}. Error: ${err}`)
      }
    }
    return connectedRelays
  }
    
  // Callback for incoming DM subscription.
  #onIncoming(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      this.#model.setMessage(msg.id, msg) //todo async?
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
      this.#model.setContact(contact)
    }
  }

}

export default ChatController