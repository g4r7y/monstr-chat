import type { DataStore } from './dataStore.js';

export type UserProfile = {
  name?: string; // aka nickname
  about?: string;
  nip05?: string;
};

export type ChatSettings = {
  inboxRelays: string[];
  generalRelays: string[];
  relaysUpdatedAt?: number;
  profile?: UserProfile;
};

const defaultSettings: ChatSettings = {
  inboxRelays: ['wss://relay.damus.io'],
  generalRelays: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.wine', 'wss://relay.snort.social', 'wss://relay.0xchat.com']
};

export type ChatContact = {
  name: string;
  npub: string;
  profile?: UserProfile;
  relays: string[];
  relaysUpdatedAt?: number;
};

export type ChatMessage = {
  id: string;
  time: Date;
  text: string;
  sender: string;
  receiver: string;
  state: 'tx' | 'rx';
};

export type ChatAppData = {
  settings: ChatSettings;
  contacts: ChatContact[];
};

export class ChatModel {
  #messages: Map<string, ChatMessage>;
  #contacts: Map<string, ChatContact>;
  #settings: ChatSettings;
  #dataStore: DataStore;

  constructor(dataStore: DataStore) {
    this.#dataStore = dataStore;
    // initialise to defaults
    this.#contacts = new Map();
    this.#messages = new Map();
    this.#settings = defaultSettings;
  }

  async load() {
    const data = await this.#dataStore.readAppData();
    if (data != null) {
      const { contacts, settings } = data;
      if (contacts) {
        // write contacts to Map object, where keys are the contact npub
        this.#contacts = new Map();
        contacts.forEach((value: ChatContact) => {
          // need to convert time string to date object
          const key = value.npub;
          if (key) {
            this.#contacts.set(key, value);
          }
        });
      }
      if (settings) {
        this.#settings = settings;
      }
    } else {
      // write initial default data
      await this.#syncAppDataToStorage();
    }

    const msgs = await this.#dataStore.readMessages();
    if (msgs != null) {
      // write messages to Map object, where keys are the message id
      this.#messages = new Map();
      msgs.forEach((value: ChatMessage) => {
        // need to convert time string to date object
        value.time = new Date(value.time);
        const key = value.id;
        this.#messages.set(key, value);
      });
    } else {
      // write initial empty list to message store
      this.#syncMessagesToLocalStore();
    }
  }

  get settings(): ChatSettings {
    return structuredClone(this.#settings);
  }

  getMessage(msgId: string): ChatMessage | null {
    const msg = this.#messages.get(msgId);
    return msg ? structuredClone(msg) : null;
  }

  getMessageList(): ChatMessage[] {
    return Array.from(this.#messages.values());
  }

  getContactList(): ChatContact[] {
    return Array.from(this.#contacts.values());
  }

  getContactByNpub(contactNpub: string): ChatContact | null {
    const contact = this.#contacts.get(contactNpub);
    return contact ? structuredClone(contact) : null;
  }

  getContactByName(name: string): ChatContact | null {
    for (const c of this.#contacts.values()) {
      if (c.name === name) {
        return structuredClone(c);
      }
    }
    return null;
  }

  async setSettings(settings: ChatSettings) {
    this.#settings = settings;
    await this.#syncAppDataToStorage();
  }

  async setMessage(msgId: string, msg: ChatMessage) {
    this.#messages.set(msgId, msg);
    await this.#syncMessagesToLocalStore();
  }

  async setContact(contact: ChatContact) {
    this.#contacts.set(contact.npub, contact);
    await this.#syncAppDataToStorage();
  }

  async deleteContact(npub: string) {
    this.#contacts.delete(npub);
    await this.#syncAppDataToStorage();
  }

  async #syncAppDataToStorage() {
    const data: ChatAppData = {
      contacts: Array.from(this.#contacts.values()),
      settings: this.#settings
    };
    await this.#dataStore.writeAppData(data);
  }

  async #syncMessagesToLocalStore() {
    const msgs = Array.from(this.#messages.values());
    await this.#dataStore.writeMessages(msgs);
  }

  // TODO synch individual messages
}
