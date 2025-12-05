import DataStore from './dataStore.js'

export type ChatSettings = {
  inboxRelays: string[],
  generalRelays: string[]
  relaysUpdatedAt: number | null
  nip05: string | null
  profileName: string | null
  profileAbout: string | null
}

const defaultSettings : ChatSettings = {
  inboxRelays: [
    'ws://localhost:8008',
    'wss://relay.damus.io',
  ],
  generalRelays: [
    'ws://localhost:8008',
    'wss://nostr.wine',
    'wss://nostr.band',
    'wss://relay.snort.social',
    'wss://relay.damus.io',
    'wss://relay.0xchat.com', 
  ],
  relaysUpdatedAt: null,
  nip05: null,
  profileName: null,
  profileAbout: null,

}

export type ChatContact = {
  name: string, //local name
  npub: string,
  nip05: string | null,
  profileName: string | null
  profileAbout: string | null
  relays: string[],
  relaysUpdatedAt: number | null
}

export type ChatMessage = {
  id: string,
  time: Date,
  text: string,
  sender: string,
  receiver: string,
  state: string // tx or rx
}

export type ChatAppData = {
  settings: ChatSettings,
  contacts: ChatContact[]
}

export class ChatModel {

  #messages: Map<string, ChatMessage>
  #contacts: Map<string, ChatContact>
  #settings: ChatSettings
  #dataStore: DataStore
  
  constructor(dataStore: DataStore) {
    this.#dataStore = dataStore
    // initialise to defaults
    this.#contacts = new Map()
    this.#messages = new Map()
    this.#settings = defaultSettings
  }
  
  async load() {
    let data = await this.#dataStore.readAppData()
    if (data != null) {
      const { contacts, settings } = data
      if (contacts) {
        // write contacts to Map object, where keys are the contact npub
        this.#contacts = new Map()
        contacts.forEach((value: ChatContact) => {
          // need to convert time string to date object
          const key = value.npub
          if (key) {
            this.#contacts.set(key, value)
          }
        })
      }
      if (settings) {
        this.#settings = settings
      }
    } else {
      // write initial default data
      await this.#syncAppDataToStorage()
    }

    let msgs = await this.#dataStore.readMessages()
    if (msgs != null) {
      // write messages to Map object, where keys are the message id
      this.#messages = new Map()
      msgs.forEach((value: ChatMessage) => {
        // need to convert time string to date object
        value.time = new Date(value.time)
        const key = value.id
        this.#messages.set(key, value)
      })
    } else {
      // write initial empty list to message store
      this.#syncMessagesToStorage()
    }
  }

  get settings(): ChatSettings {
    return structuredClone(this.#settings)
  }

  getMessage(msgId: string): ChatMessage | null {
    const msg = this.#messages.get(msgId)
    return msg ? structuredClone(msg) : null
  }

  getMessageList(): ChatMessage[] {
    return Array.from(this.#messages.values())
  }
  
  getContactList(): ChatContact[] {
    return Array.from(this.#contacts.values())
  }

  getContactByNpub(contactNpub : string): ChatContact | null {
    const contact = this.#contacts.get(contactNpub)
    return contact ? structuredClone(contact) : null
  }

  getContactByName(name : string): ChatContact | null {
    for(let c of this.#contacts.values()) {
      if (c.name === name) {
        return structuredClone(c)
      }
    }
    return null
  }

  // Get conversations
  // @return Map of conversations, where key is the contact npub, value is list of messages
  getConversations(): Map<string,ChatMessage[]> {
    const convs = new Map<string, ChatMessage[]>()
    const sortedMessages = Array.from(this.#messages.values())
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

  async setSettings(settings: ChatSettings) {
    this.#settings = settings
    await this.#syncAppDataToStorage()
  }
  
  async setMessage(msgId: string, msg: ChatMessage) {
    this.#messages.set(msgId, msg)
    await this.#syncMessagesToStorage()
  }

  async setContact(contact: ChatContact) {
    this.#contacts.set(contact.npub, contact)
    await this.#syncAppDataToStorage()
  }

  async deleteContact(npub: string) {
    this.#contacts.delete(npub)
    await this.#syncAppDataToStorage()
  }

  async #syncAppDataToStorage() {
    const data: ChatAppData = { 
      contacts: Array.from(this.#contacts.values()), 
      settings: this.#settings 
    }
    await this.#dataStore.writeAppData(data) 
  }
  
  async #syncMessagesToStorage() {
    const msgs = Array.from(this.#messages.values())
    await this.#dataStore.writeMessages(msgs)
  }
}
