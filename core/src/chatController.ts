
import { getPublicKey, type Event } from '@nostr/tools'

import { nsecEncode, npubEncode, decode } from '@nostr/tools/nip19'
import { generateSeedWords, accountFromSeedWords } from '@nostr/tools/nip06'
import { queryProfile } from '@nostr/tools/nip05'
import { SimplePool } from '@nostr/tools'
import { normalizeURL } from '@nostr/tools/utils'

import { sendDm, type SendDmRecipient } from './nostrSendDm.js'
import { receiveDms } from './nostrReceiveDm.js'
import { getRelayListMetadata, publishRelayListMetadata, subscribeToRelayListMetadata, extractReadRelaysFromNip65 } from './nostrRelayMetadata.js'
import { getUserMetadata, publishUserMetadata, subscribeToUserMetadata, extractContentFromUserMetadataEvent } from './nostrUserMetadata.js'
import type { KeyStore } from './keyStore.js'
import { ChatModel, type ChatMessage, type ChatContact, type ChatSettings, type UserProfile } from './chatModel.js'
import { isValidNpub } from './validation.js'
import createRelayMonitor, { type RelayMonitor } from './relayMonitor.js'
import type { MessageListener } from './messageListener.js'
import type { SettingsListener } from './settingsListener.js'


export interface ChatController {
  init() : Promise<boolean>,
  connect() : Promise<boolean>,
  close() : void,
  
  addMessageListener(listener: MessageListener) : void
  removeMessageListener(listener: MessageListener) : void

  addSettingsListener(listener: SettingsListener) : void
  removeSettingsListener(listener: SettingsListener) : void

  getSettings() : ChatSettings
  setSettings(settings: ChatSettings) : Promise<void> 
  getContactByNpub(contactNpub : string): ChatContact | null
  getConversations(): Map<string,ChatMessage[]>
  getContactByName(name : string): ChatContact | null
  getContactList(): ChatContact[]
  setContact(contact: ChatContact) : Promise<void>
  deleteContact(npub: string) : Promise<void>

  sendDmToContact(recipient: ChatContact, text: string) : Promise<void>
  sendDmToNpub(recipientNpub: string, text: string) : Promise<void>

  subscribeToIncomingDms() : Promise<void>
  subscribeToRelayMetadata() : Promise<void>
  broadcastRelayList() : Promise<void>
  subscribeToUserMetadata() : Promise<void>
  broadcastUserMetadata()  : Promise<void>
  checkConnectedRelays(relayUrls: string[]) : string[]

  getNpub() : string
  getNsec() : string
  lookupNip05Address(nip05: string) : Promise<string | null> 

  createNewKey() : Promise<string>
  resetKey(nsec: string) : Promise<void>
  resetKeyFromSeedWords(bip39Mnemonic: string) : Promise<void>
  getUserProfile(npub: string) : Promise<UserProfile | null>
}


export class ChatControllerImpl implements ChatController {
  #model: ChatModel
  #keyStore: KeyStore
  #messageListeners: MessageListener[]
  #settingsListeners: SettingsListener[]
  #pubKey: string
  #privateKey: Uint8Array
  #pool: SimplePool
  #relayMonitor: RelayMonitor
  #offline: boolean //not used yet

 
  constructor(model: ChatModel, keyStore: KeyStore) {
    this.#model = model
    this.#keyStore = keyStore
    this.#messageListeners = []
    this.#settingsListeners = []

    this.#pubKey = ''
    this.#privateKey = new Uint8Array()
    
    const poolOptions = { enablePing: true, enableReconnect: true }
    this.#pool = new SimplePool(poolOptions)

    this.#relayMonitor = createRelayMonitor(this.#pool) 
    this.#offline = false
    void this.#offline; //not used yet, suppress linter

  }

  addMessageListener(listener: MessageListener) {
    this.#messageListeners.push(listener)
  }

  removeMessageListener(listener: MessageListener) {
    this.#messageListeners = this.#messageListeners.filter( l => l !== listener)
  }

  addSettingsListener(listener: SettingsListener) {
    this.#settingsListeners.push(listener)
  }

  removeSettingsListener(listener: SettingsListener) {
    this.#settingsListeners = this.#settingsListeners.filter( l => l !== listener)
  }

  async init() : Promise<boolean> {
    // try and read key from store
    let nsecStr = await this.#keyStore.readKey()
    if (nsecStr) {
      const decoded = decode(nsecStr)
      if (decoded.type === 'nsec' && decoded.data) {
        this.#privateKey = decoded.data as Uint8Array
        this.#pubKey = getPublicKey(this.#privateKey)
      }
    }
    
    if (this.#privateKey.length == 0) {
      // no existing key, go to welcome state
      return false
    }
    
    // load settings, contacts, messages
    await this.#model.load()
    return true
  }
    
  async connect() : Promise<boolean> {
    let subscribedOk = await this.#subscribeToRelays()

    // allow time for inbox relays to start
    const delay = async (milliseconds: number) => {
      return new Promise((r) => {
        setTimeout( () => { r(true) }, milliseconds)
      })
    }
    await delay(500)

    this.#relayMonitor.start(this.#model.settings.inboxRelays, this.#onConnectionChange.bind(this))

    // initial check in case all inbox relays are bad
    const connError = (this.checkConnectedRelays(this.#model.settings.inboxRelays).length === 0)  

    if (!subscribedOk || connError) {
      this.#offline = true
      return false
    } 

    return true
  }

  close() {
    this.#pool.destroy()
  }

  // model

  getSettings() : ChatSettings {
    return this.#model.settings
  }

  async setSettings(settings: ChatSettings) : Promise<void> {
    await this.#model.setSettings(settings)
  }

  getContactByNpub(contactNpub : string): ChatContact | null {
    return this.#model.getContactByNpub(contactNpub)
  }

  // Get conversations
  // @return Map of conversations, where key is the contact npub, value is list of messages
  getConversations(): Map<string,ChatMessage[]> {
    const convs = new Map<string, ChatMessage[]>()
    const sortedMessages = Array.from(this.#model.getMessageList())
    // sort descending (i.e. head will be newest)
    sortedMessages.sort((a: ChatMessage, b: ChatMessage) => b.time.getTime() - a.time.getTime())
    for(let msg of sortedMessages) {
      const key = (msg.state === 'tx') ? msg.receiver : msg.sender
      let msgList = convs.has(key) ? convs.get(key)! : new Array()
      msgList.push(msg)
      convs.set(key, msgList)
    }
    return convs
  }

  getContactByName(name : string): ChatContact | null {
    return this.#model.getContactByName(name)
  }

  getContactList(): ChatContact[] {
    return this.#model.getContactList()
  }

  async setContact(contact: ChatContact) {
    await this.#model.setContact(contact)
  }

  async deleteContact(npub: string) {
    await this.#model.deleteContact(npub)
  }


  // Send DM using the recipient's inbox relay(s).
  // Also sends a copy to ourself so our sent messages will persist on relay.
  async sendDmToContact(recipient: ChatContact, text: string) {
    if (!recipient?.relays?.length) {
      console.log(`Send: contact ${recipient.npub} doesn't have relay defined, trying to fetch relaylist first`)
      await this.sendDmToNpub(recipient.npub, text)
    } else {
      await this.sendDmToNpub(recipient.npub, text, recipient.relays)
    }
  }

  // Send DM to specified npub.
  // If relays not given, tries to fetch the recipient's relay(s) from NIP65, 
  // then sends DM using the recipient's inbox relay(s).
  // Throws if no read relays can be found.
  // Also sends a copy to ourself so our sent messages will persist on relay.
  async sendDmToNpub(recipientNpub: string, text: string, recipientRelays?: string[]) {
    const recipientPubKey = decode(recipientNpub).data as string

    if (!recipientRelays) {
      const event = await getRelayListMetadata(recipientPubKey, this.#pool, this.#model.settings.generalRelays)

      if (!event) {
        console.log(`Send: can't find NIP65 relaylist for ${recipientNpub}`)
        throw new Error('NoRelay')
      }

      recipientRelays = extractReadRelaysFromNip65(event)
      if (!recipientRelays?.length) {
        console.log(`Send: relaylist for ${recipientNpub} is missing or empty`)
        throw new Error('NoRelay')
      }
    }

    const selfRelays = this.#model.settings.inboxRelays
    const recipientGroup: SendDmRecipient[] = [
      { pubKey: recipientPubKey, relays: recipientRelays}
    ]
    // if not a message to self, additionally include sender in recipient list
    if (recipientPubKey !== this.#pubKey) {
      recipientGroup.push({ pubKey: this.#pubKey, relays: selfRelays})
    }
    await sendDm(this.#privateKey, recipientGroup, this.#pool, text)
  }

  // Subscribe/re-subscribe to receive DMs from inbox relays
  async subscribeToIncomingDms() {
    console.log(`Subscribing to receive DMs`)
    await receiveDms(this.#pubKey, this.#privateKey, 
      this.#pool, this.#model.settings.inboxRelays, 
      async (msg: ChatMessage) => await this.#onNewMessage(msg))
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
    const profile = settings.profile ?? { name: null, about: null, nip05: null }
    await publishUserMetadata(this.#pubKey, this.#privateKey,
      this.#pool, this.#model.settings.generalRelays, profile)
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
    await this.#keyStore.writeKey(nsecEncode(this.#privateKey ))

    // Now that we have a new key we broadcast its default relaylist
    await this.broadcastRelayList()

    return words
  }

  // Reset key from nsec
  async resetKey(nsec: string) {
    this.#privateKey = decode(nsec).data as Uint8Array
    this.#pubKey = getPublicKey(this.#privateKey)
    await this.#keyStore.writeKey(nsecEncode(this.#privateKey ))
    // Note: we don't broadcast relays when switching to existing key - our subscription should receive key's existing relaylist 
  }
  
  // Reset key from bip39
  async resetKeyFromSeedWords(bip39Mnemonic: string) {
    let { publicKey, privateKey } = accountFromSeedWords(bip39Mnemonic)
    this.#privateKey = privateKey
    this.#pubKey = publicKey
    await this.#keyStore.writeKey(nsecEncode(this.#privateKey ))
    // Note: we don't broadcast relays when switching to existing key - our subscription should receive key's existing relaylist 
  }

  
  async getUserProfile(npub: string) : Promise<UserProfile | null> {
    const userPubKey = decode(npub).data as string
    const userEvent = await getUserMetadata(userPubKey, this.#pool, this.#model.settings.generalRelays)
    if (!userEvent) {
      return null
    }
    
    const content = extractContentFromUserMetadataEvent(userEvent)
    
    let nip05 = null
    if (content?.nip05) {
      const foundNpub = await this.lookupNip05Address(content.nip05)
      if (foundNpub === npub) {
        nip05 = content.nip05
      }
    }
    let profile: UserProfile = {
      name: content?.name ?? null,
      about: content?.about ?? null,
      nip05
    }
    return profile
  }
  
  async lookupNip05Address(nip05: string) : Promise<string | null> {
    const profile =  await queryProfile(nip05)
    try {
      const npub = profile ? npubEncode(profile.pubkey) : null
      return npub
    } catch {
      return null
    }
  }

  ///////////////////////////////////////////////////////////
  // private methods

  async #subscribeToRelays() : Promise<boolean> {
    try {
      await this.subscribeToIncomingDms()
      await this.subscribeToRelayMetadata()
      await this.subscribeToUserMetadata()
    } catch (err) {
      console.log(`Subscription error: ${err}`)
      return false
    }
    return true
  }


  async #onConnectionChange(connectionState: boolean) {
    if (connectionState) {
      console.log('Connection resumed. Resubscribing...')
      this.#offline = false
      const success = await this.#subscribeToRelays()
      if (success) {
        console.log('Successfully subscribed. No longer offline')
      }
    } else {
      console.log('Connection lost. Going offline')
      this.#offline = true 
    }
  }
  
  
  // Callback for new DM. This could be an incoming message or also a sent DM.
  // saves the message locally then notifies any subscribed listeners.
  async #onNewMessage(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      await this.#model.setMessage(msg.id, msg)
      this.#messageListeners.forEach(l => l.notifyMessage(msg))
    }
  }

  // Callback for NIP65 relay list subscription.
  // Called whenever a subscribed npub's relaylist changes. 
  // Checks if we have a corresponding contact and updates its relaylist.
  // May also be called for our own relaylist.
  // Only does update if created_at time is newer than last update as we will get duplicate events
  // from multiple relays.
  async #onRelaylistMetadata(ev: Event) {
    const npub = npubEncode(ev.pubkey)
    const contact = this.#model.getContactByNpub(npub)

    // if it is a known contact and event time is newer (in case there are duplicate events from several relays)
    if (contact && (!contact.relaysUpdatedAt || contact.relaysUpdatedAt < ev.created_at)) {
      contact.relays = extractReadRelaysFromNip65(ev)
      contact.relaysUpdatedAt = ev.created_at
      console.log(`Updating relaylist for contact: ${contact.name}`) 
      await this.#model.setContact(contact)
    }

    // if we have received relay list for self (perhaps changed on another client)
    if (ev.pubkey === this.#pubKey) {
      console.log(`Received relaylist for self`, ev.created_at, this.#model.settings.relaysUpdatedAt) 
      // update local relay settings if event time is newer
      if (!this.#model.settings.relaysUpdatedAt || this.#model.settings.relaysUpdatedAt < ev.created_at) { 
        const currentSettings = this.#model.settings
        const eventRelays = extractReadRelaysFromNip65(ev)
        if (JSON.stringify(eventRelays)!==JSON.stringify(currentSettings.inboxRelays)) {
          console.log(`Updating relaylist for self`) 
          currentSettings.inboxRelays = eventRelays
          currentSettings.relaysUpdatedAt = ev.created_at
          await this.#model.setSettings(currentSettings)
          // resubscribe to the new inbox relays
          await this.subscribeToIncomingDms()
          this.#settingsListeners.forEach(l => l.notifySettingsChanged())
        }
      }
    }
  }

  // Callback for kind0 user metadata event subscription.
  // Called whenever a subscribed npubs's user metadata changes.
  // Checks if we have a corresponding contact and updates its details
  // If npub is ourself, updates our own profile in settings.
  async #onUserMetadata(ev: Event) {
    const npub = npubEncode(ev.pubkey)

    const mergeProfile = async (localProfile: UserProfile | null, remoteProfile: UserProfile) => {
      localProfile = remoteProfile
      if (remoteProfile.nip05 !== localProfile?.nip05) {
        // default to overriding local value with null
        localProfile.nip05 = null
        if (remoteProfile.nip05) {
          // new nip05, so verify it before we save it
          const nip05Npub = await this.lookupNip05Address(remoteProfile.nip05)
          if (nip05Npub === npub) {
            // update local profile with verified nip05
            localProfile.nip05 = remoteProfile.nip05
          }
        }
      }
    }

    // TODO only update if event time is newer than last update?
    const userProfile = extractContentFromUserMetadataEvent(ev)
    if (userProfile) {
      // update user metadata for contact
      const contact = this.#model.getContactByNpub(npub)
      if (contact ) {
        await mergeProfile(contact.profile, userProfile)
        console.log(`Updating user profile for contact: ${contact.name}`) 
        await this.#model.setContact(contact)
      }

      // update user metadata for self
      if (ev.pubkey === this.#pubKey) {
        const currentSettings = this.#model.settings
        await mergeProfile(currentSettings.profile, userProfile)
        console.log(`Updating user profile for self`) 
        await this.#model.setSettings(currentSettings)
        this.#settingsListeners.forEach(l => l.notifySettingsChanged())
      }
    }
  }
}