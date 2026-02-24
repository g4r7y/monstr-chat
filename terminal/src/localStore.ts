import os from 'os';
import fs from 'fs/promises';
import type { ChatAppData, ChatMessage } from '../../core/src/chatModel.js';
import type { KeyStore } from '@core/keyStore.js';
import type { DataStore } from '@core/dataStore.js';

const getAppDir = () => {
  let appDir = '.nostrchat';
  const arg1 = process.argv[2];
  if (arg1) {
    const [k, v] = arg1.split('=');
    if (k == 'appDir') {
      appDir = v;
    }
  }
  return appDir;
};
const appFolder = getAppDir();
console.log(appFolder);

class LocalStore implements KeyStore, DataStore {
  async readKey(): Promise<string | null> {
    try {
      const data = await fs.readFile(`${os.homedir()}/${appFolder}/key`, { encoding: 'utf8' });
      if (typeof data === 'string') {
        return data;
      }
    } catch (_) {
      // any file read error, just fall through and return null
    }

    // couldn't find file or bad contents
    return null;
  }

  async writeKey(keyStr: string) {
    const path = `${os.homedir()}/${appFolder}`;
    try {
      await fs.mkdir(path, { recursive: true });
      await fs.writeFile(`${path}/key`, keyStr, { encoding: 'utf8' });
    } catch (_) {
      throw new Error(`Couldn't write private key to file: ${path}/key`);
    }
  }

  async readAppData(): Promise<ChatAppData | null> {
    try {
      const str = await fs.readFile(`${os.homedir()}/${appFolder}/data`, { encoding: 'utf8' });
      return JSON.parse(str);
    } catch (err) {
      console.log('Error reading app data', err);
    }

    // couldn't find file or invalid json
    return null;
  }

  async writeAppData(appData: ChatAppData) {
    const path = `${os.homedir()}/${appFolder}`;
    try {
      await fs.mkdir(path, { recursive: true });
      await fs.writeFile(`${path}/data`, JSON.stringify(appData), { encoding: 'utf8' });
    } catch (_) {
      throw new Error(`Couldn't write app data key to file: ${path}/data`);
    }
  }

  async readMessages(): Promise<ChatMessage[] | null> {
    try {
      const str = await fs.readFile(`${os.homedir()}/${appFolder}/msgs`, { encoding: 'utf8' });
      return JSON.parse(str);
    } catch (_) {
      // any file read error, just fall through and return null
    }

    // couldn't find file or invalid json
    return null;
  }

  async writeMessages(msgs: ChatMessage[]) {
    const path = `${os.homedir()}/${appFolder}`;
    try {
      await fs.mkdir(path, { recursive: true });
      await fs.writeFile(`${path}/msgs`, JSON.stringify(msgs), { encoding: 'utf8' });
    } catch (_) {
      throw new Error(`Couldn't write messages to file: ${path}/msgs`);
    }
  }
}

export default LocalStore;
