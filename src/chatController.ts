
import { getPublicKey, Event } from '@nostr/tools'

import { nsecEncode, npubEncode, decode } from '@nostr/tools/nip19'
import { generateSeedWords, accountFromSeedWords } from '@nostr/tools/nip06'
import { queryProfile } from '@nostr/tools/nip05'
import { SimplePool } from '@nostr/tools'
import { normalizeURL } from '@nostr/tools/utils'

import { sendDm } from './nostrSendDm.js'
import { receiveDms } from './nostrReceiveDm.js'
import { getRelayListMetadata, publishRelayListMetadata, subscribeToRelayListMetadata, extractReadRelaysFromNip65 } from './nostrRelayMetadata.js'
import { getUserMetadata, publishUserMetadata, subscribeToUserMetadata, extractContentFromUserMetadataEvent } from './nostrUserMetadata.js'
import { ChatModel, ChatMessage, ChatContact } from './chatModel.js'
import { readKey, writeKey } from './localStore.js'
import { isValidNpub } from './validation.js'
import ChatUi from './terminal/viewRouter.js'


class ChatController {
  #pubKey: string
  #privateKey: Uint8Array
  #model: ChatModel
  #ui: ChatUi
  #pool: SimplePool

  constructor() {
    this.#pubKey = ''
    this.#privateKey = new Uint8Array()

    this.#model = new ChatModel()
    this.#ui = new ChatUi(this, this.#model)
    
    const poolOptions = { enablePing: true, enableReconnect: true }
    this.#pool = new SimplePool(poolOptions)
  }

  async run() {
    // load settings, contacts, messages
    await this.#model.load()

    // try and read key from store
    let nsecStr = await readKey()
    if (nsecStr) {
      const decoded = decode(nsecStr)
      if (decoded.type === 'nsec' && decoded.data) {
        this.#privateKey = decoded.data as Uint8Array
        this.#pubKey = getPublicKey(this.#privateKey)
      }
    }

    let firstLaunch = false

    if (this.#privateKey.length == 0) {
      // no existing key
      firstLaunch = true
      await this.#ui.go('welcome')
      if (this.#privateKey.length == 0) {
        // still no key, so just exit
        return
      }
    }
    
    
    let startupError = false

    try {
      await this.subscribeToIncomingDms()
      await this.subscribeToRelayMetadata()
      await this.subscribeToUserMetadata()
    } catch (err) {
      console.log(`Startup error: ${err}`)
      startupError = true
    }
    
    // allow tim for inbox relays to start
    const onTimer = async (milliseconds: number) => {
      return new Promise((r) => {
        setTimeout( () => { r(true) }, milliseconds)
      })
    }
    await onTimer(500)

    // check in case all inbox relays are bad
    const connError = (this.checkConnectedRelays(this.#model.settings.inboxRelays).length === 0)

    if (startupError || connError) {
      await this.#ui.go('offline')
    } else {
      await this.#ui.go()
    }

    this.#pool.destroy()
  }

  // Send DM using the recipient's inbox relay(s)
  async sendDmToContact(recipient: ChatContact, text: string) {
    const recipientPubKey = decode(recipient.npub).data as string

    if (!recipient?.relays?.length) {
      console.log(`Send: contact ${recipient.npub} doesn't have relay defined, trying again with relaylist fetch`)
      await this.sendDmToUnknown(recipient.npub, text)
    } else {
      const sentMsg = await sendDm(this.#pubKey, this.#privateKey, recipientPubKey, this.#pool, recipient.relays, text)
      await this.#model.setMessage(sentMsg.id, sentMsg)
    }
  }

  // Send DM to an unknown contact.
  // First tries to fetch the recipient's relay(s) from NIP65, 
  // then sends DM using the recipient's inbox relay(s).
  // Throws if no read relays can be found.
  async sendDmToUnknown(recipientNpub: string, text: string) {
    const recipientPubKey = decode(recipientNpub).data as string
    
    const event = await getRelayListMetadata(recipientPubKey, this.#pool, this.#model.settings.generalRelays)

    if (!event) {
      console.log(`Send: can't find NIP65 relaylist for ${recipientNpub}`)
      throw new Error('NoRelay')
    }

    const recipientRelays = extractReadRelaysFromNip65(event)
    if (!recipientRelays?.length) {
       console.log(`Send: relaylist for ${recipientNpub} is missing or empty`)
      throw new Error('NoRelay')
    }
    const sentMsg = await sendDm(this.#pubKey, this.#privateKey, recipientPubKey, this.#pool, recipientRelays, text)
    await this.#model.setMessage(sentMsg.id, sentMsg)
  }

  // Subscribe/re-subscribe to receive DMs from inbox relays
  async subscribeToIncomingDms() {
    await receiveDms(this.#pubKey, this.#privateKey, 
      this.#pool, this.#model.settings.inboxRelays, 
      async (msg: ChatMessage) => await this.#onIncoming(msg))
  }

  // Subscribe/re-subscribe to receive relaylist metadata for all of our contacts.
  // Also include our own npub in case relayslist is changed by another client.
  // General (aka discovery) relays are used for the subscription
  async subscribeToRelayMetadata() {
    // subscribing for all of our contacts
    let npubs = this.#model.getContactList()
      .map(c => c.npub)
      .filter(npub => isValidNpub(npub))
      .map(npub => decode(npub).data as string)
      
    // subscribe for self too
    npubs.push(this.#pubKey)

    console.log(`Subscribing to relay metadata for contacts: ${this.#model.getContactList().map(c=>c.name)} + self`)
    await subscribeToRelayListMetadata(npubs, this.#pool, 
      this.#model.settings.generalRelays, 
      async (ev: Event) => await this.#onRelaylistMetadata(ev)
    )
  }

  // Broadcast our inbox relay list to the general discovery relays so that other people know how to send message to us
  // Throws if cannot broadcast to any relays
  async broadcastRelayList() {
    await publishRelayListMetadata(this.#pubKey, this.#privateKey,
      this.#pool, this.#model.settings.generalRelays, 
      this.#model.settings.inboxRelays)
  }

    // Subscribe/re-subscribe to receive user metadata for all of our contacts.
  // Also include our own npub in case user metadata is changed by another client.
  // General (aka discovery) relays are used for the subscription
  async subscribeToUserMetadata() {
    // subscribing for all of our contacts
    let npubs = this.#model.getContactList()
      .map(c => c.npub)
      .filter(npub => isValidNpub(npub))
      .map(npub => decode(npub).data as string)
      
    // subscribe for self too
    npubs.push(this.#pubKey)

    console.log(`Subscribing to user metadata for contacts: ${this.#model.getContactList().map(c=>c.name)} + self`)
    await subscribeToUserMetadata(npubs, this.#pool, 
      this.#model.settings.generalRelays, 
      async (ev: Event) => await this.#onUserMetadata(ev)
    )
  }


  // Broadcast our user metadata to the general discovery relays. This includes our nip05 address.
  // Throws if cannot broadcast to any relays
  async broadcastUserMetadata() {
    const settings = this.#model.settings
    const content: Record<string, string> = {
      ...(settings.profileName ? {name: settings.profileName} : {}),
      ...(settings.profileAbout ? {about: settings.profileAbout} : {}),
      ...(settings.nip05 ? {nip05: settings.nip05} : {}),
    }
    await publishUserMetadata(this.#pubKey, this.#privateKey,
      this.#pool, this.#model.settings.generalRelays, content)
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

  getNpub() : string {
    return npubEncode(this.#pubKey)
  }

  getNsec() : string {
    return nsecEncode(this.#privateKey)
  }

  // Create new key, 
  // @return string: bip39 word list
  async createNewKey() : Promise<string> {
    const words = generateSeedWords()
    let { publicKey, privateKey } = accountFromSeedWords(words)
    this.#privateKey = privateKey
    this.#pubKey = publicKey
    await writeKey(nsecEncode(this.#privateKey ))

    // Now that we have a new key we broadcast its default relaylist
    await this.broadcastRelayList()

    return words
  }

  // Reset key from nsec
  async resetKey(nsec: string) {
    this.#privateKey = decode(nsec).data as Uint8Array
    this.#pubKey = getPublicKey(this.#privateKey)
    await writeKey(nsecEncode(this.#privateKey ))
    // Note: we don't broadcast relays when switching to existing key - our subscription should receive key's existing relaylist 
  }
  
  // Reset key from bip39
  async resetKeyFromSeedWords(bip39Mnemonic: string) {
    let { publicKey, privateKey } = accountFromSeedWords(bip39Mnemonic)
    this.#privateKey = privateKey
    this.#pubKey = publicKey
    await writeKey(nsecEncode(this.#privateKey ))
    // Note: we don't broadcast relays when switching to existing key - our subscription should receive key's existing relaylist 
  }

  
  async getUserProfile(npub: string) : Promise<Record<string, string> | null> {
    const userPubKey = decode(npub).data as string
    const userEvent = await getUserMetadata(userPubKey, this.#pool, this.#model.settings.generalRelays)
    if (!userEvent) {
      return null
    }
    
    const content = extractContentFromUserMetadataEvent(userEvent)
    console.log('getUserProfile1', npub, userEvent)
    
    let profile: Record<string, string> = {}

    if (content?.nip05) {
      const foundNpub = await this.lookupNip05Address(content.nip05)
      console.log('getUserProfile2 lookup nip05 found:', foundNpub)
      if (foundNpub === npub) {
        profile.nip05 = content.nip05
      }
    }
    profile.name = content?.name ?? null
    profile.about = content?.about ?? null
    return profile
  }
  
  async lookupNip05Address(nip05: string) : Promise<string | null> {
    const profile =  await queryProfile(nip05)
    const npub = profile ? npubEncode(profile.pubkey) : null
    return npub
  }
  
  // Callback for incoming DM subscription.
  async #onIncoming(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      await this.#model.setMessage(msg.id, msg)
      this.#ui.newMessage(msg)
    }
  }

  // Callback for NIP65 relay list subscription.
  // Called whenever a subscribed npubs's relaylist changes.
  // Checks if we have a corresponding contact and updates its relaylist.
  // Only do this if created_at time is newer than last update as we will get duplicate events
  // from multiple relay.
  async #onRelaylistMetadata(ev: Event) {
    const npub = npubEncode(ev.pubkey)
    const contact = this.#model.getContactByNpub(npub)
    // update contact if event time is newer (in case there are duplicate events from several relays)
    if (contact && (!contact.relaysUpdatedAt || contact.relaysUpdatedAt < ev.created_at)) {
      contact.relays = extractReadRelaysFromNip65(ev)
      contact.relaysUpdatedAt = ev.created_at
      console.log(`Updating relaylist for contact: ${contact.name}`) 
      await this.#model.setContact(contact)
    }
    // update local settings if event time is newer
    if (ev.pubkey === this.#pubKey) {
      console.log(`Received relaylist for self`, ev.created_at, this.#model.settings.relaysUpdatedAt) 
      if (!this.#model.settings.relaysUpdatedAt || this.#model.settings.relaysUpdatedAt < ev.created_at) { 
        const currentSettings = this.#model.settings
        const eventRelays = extractReadRelaysFromNip65(ev)
        if (JSON.stringify(eventRelays)!==JSON.stringify(currentSettings.inboxRelays)) {
          console.log(`Updating relaylist for self`) 
          currentSettings.inboxRelays = eventRelays
          await this.#model.setSettings(currentSettings)
        }
      }
    }
  }

  // Callback for kind0 user metadata event subscription.
  // Called whenever a subscribed npubs's user metadata changes.
  // Checks if we have a corresponding contact and updates its details.
  async #onUserMetadata(ev: Event) {
    const npub = npubEncode(ev.pubkey)
    // update user metadata for contact
    const contact = this.#model.getContactByNpub(npub)
    if (contact ) {
      // TODO only update contact if event time is newer than last update?
      const content = extractContentFromUserMetadataEvent(ev)
      contact.profileName = content?.name ?? contact.profileName
      contact.profileAbout = content?.about ?? contact.profileAbout
      if (content?.nip05 !== contact.nip05) {
        if (!content?.nip05) {
          contact.nip05 = null
        } else {
          const nip05Npub = await this.lookupNip05Address(content.nip05)
          if (nip05Npub === npub) {
            // update contact with verified nip05
            contact.nip05 = content.nip05
          }
        }
      }
      console.log(`Updating user profile for contact: ${contact.name}`) 
      await this.#model.setContact(contact)
    }
      
    // update user metadata for self
    if (ev.pubkey === this.#pubKey) {
      console.log(`Received user metadata for self`) 
      const currentSettings = this.#model.settings
      const content = extractContentFromUserMetadataEvent(ev)
      currentSettings.profileName = content?.name ?? currentSettings.profileName
      currentSettings.profileAbout = content?.about ?? currentSettings.profileAbout
      if (content?.nip05 !== currentSettings.nip05) {
        if (!content?.nip05) {
          currentSettings.nip05 = null
        } else {
          const nip05Npub = await this.lookupNip05Address(content.nip05)
          if (nip05Npub === this.getNpub()) {
            // update our settings with verified nip05
            currentSettings.nip05 = content.nip05
          }
        }
      }
      console.log(`Updating user profile for self`) 
      await this.#model.setSettings(currentSettings)
    }
  }
}

export default ChatController