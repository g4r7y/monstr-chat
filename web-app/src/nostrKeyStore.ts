import type { KeyStore } from '@core/keyStore.js'

// TODOuse localstorage / window.nostr
let nsec: string|null = null

class NostrKeyStore implements KeyStore {
  readKey(): Promise<string | null> {
    return Promise.resolve(nsec)
  }

  writeKey(keyStr: string): void {
    nsec = keyStr
  }
}

export default NostrKeyStore