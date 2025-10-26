import { readAppData, writeAppData, readMessages, writeMessages } from './localStore.js'

export type ChatSettings = {
  inboxRelays: string[]
  generalRelays: string[]
}

const defaultSettings : ChatSettings = {
  inboxRelays: [
    'ws://localhost:8008',
    // 'wss://relay.0xchat.com' 
  ],
  generalRelays: [
    'ws://localhost:8008',
    // 'wss://relay.0xchat.com', 
    // 'wss://nostr.lol'
  ]
}

export type ChatContact = {
  name: string,
  npub: string
}

export type ChatMessage = {
  id: string,
  time: Date,
  text: string,
  sender: string
  receiver: string
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
  
  constructor() {
    // initialise to defaults
    this.#contacts = new Map()
    this.#messages = new Map()
    this.#settings = defaultSettings
  }
  
  async load() {
    let data = await readAppData()
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
      await this.#syncAppDataToLocalStore()
    }

    let msgs = await readMessages()
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
      this.#syncMessagesToLocalStore()
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
    const contacts = Array.from(this.#contacts.values())
    return contacts.sort((a: ChatContact, b: ChatContact) => a.name.localeCompare(b.name))
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
    await this.#syncAppDataToLocalStore()
  }
  
  async setMessage(msgId: string, msg: ChatMessage) {
    this.#messages.set(msgId, msg)
    await this.#syncMessagesToLocalStore()
  }

  async setContact(name: string, npub: string) {
    this.#contacts.set(npub, {name,npub})
    await this.#syncAppDataToLocalStore()
  }

  async deleteContact(npub: string) {
    this.#contacts.delete(npub)
    await this.#syncAppDataToLocalStore()
  }

  async #syncAppDataToLocalStore() {
    const data: ChatAppData = { 
      contacts: Array.from(this.#contacts.values()), 
      settings: this.#settings 
    }
    await writeAppData(data) 
  }
  
  async #syncMessagesToLocalStore() {
    const msgs = Array.from(this.#messages.values())
    await writeMessages(msgs)
  }
}
