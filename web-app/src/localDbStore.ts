import type { ChatAppData, ChatContact, ChatMessage, ChatSettings } from '@core/chatModel';
import type { DataStore } from '@core/dataStore';
import type { KeyStore } from '@core/keyStore';
import { openDB } from 'idb';

class ChatDataStore implements DataStore, KeyStore {
  private dbPromise;
  constructor() {
    this.dbPromise = openDB('monstr-db', 1, {
      upgrade(db) {
        db.createObjectStore('appData');
        db.createObjectStore('messages');
        db.createObjectStore('keys');
      }
    });
  }

  async readAppData(): Promise<ChatAppData | null> {
    const db = await this.dbPromise;
    const settingsStr = await db.get('appData', 'settings');
    const contactsStr = await db.get('appData', 'contacts');
    try {
      const settings: ChatSettings = JSON.parse(settingsStr);
      const contacts: ChatContact[] = JSON.parse(contactsStr);
      return { settings, contacts };
    } catch {
      console.error('Corrupt app data in IndexedDB');
      return null;
    }
  }

  async writeAppData(appData: ChatAppData): Promise<void> {
    const db = await this.dbPromise;
    await db.put('appData', JSON.stringify(appData.settings), 'settings');
    await db.put('appData', JSON.stringify(appData.contacts), 'contacts');
  }

  async readMessages(): Promise<ChatMessage[] | null> {
    const db = await this.dbPromise;
    const keys = await db.getAllKeys('messages');
    const msgStrs = await Promise.all(keys.map(msgId => db.get('messages', msgId)));
    try {
      return msgStrs.map(str => JSON.parse(str));
    } catch {
      console.error('Corrupt message data in IndexedDB');
      return null;
    }
  }

  async writeMessages(msgs: ChatMessage[]): Promise<void> {
    const db = await this.dbPromise;
    await Promise.all(msgs.map(msg => db.put('messages', JSON.stringify(msg), msg.id)));
  }

  async readKey(): Promise<string | null> {
    const db = await this.dbPromise;
    const nsec = await db.get('keys', 'nsec');
    return nsec ?? null;
  }

  async writeKey(keyStr: string): Promise<void> {
    // TODO - this is storing private key as plain text. We should ideally
    // encrypt it with user-provided password
    const db = await this.dbPromise;
    await db.put('keys', keyStr, 'nsec');
  }
}

export default ChatDataStore;
