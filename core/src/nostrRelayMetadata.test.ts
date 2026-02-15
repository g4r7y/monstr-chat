import { expect, test, describe } from 'vitest'
import { generateSecretKey, finalizeEvent, type EventTemplate  } from '@nostr/tools'
import { extractReadRelaysFromNip65 } from './nostrRelayMetadata.js'

describe('relay metadata', () => {
  test('extract read relays', () => {

    const nsec = generateSecretKey(); // test private key
    const tempEv: EventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 1002,
      tags: [
        ['r'],
        ['r', 'wss://read-me.lol'],
        ['r', 'wss://read-relay.com'],
        ['r', 'wss://write-relay.example2.com', 'write'],
        ['r', 'wss://nostr-read-relay.example.com', 'read'],
        ['?', 'some crap', 'read'],
        []
      ],
      content: '',
    };

    const ev = finalizeEvent(tempEv, nsec)

    const extractedReadRelays = extractReadRelaysFromNip65(ev)
    expect(extractedReadRelays).toEqual(
      ['wss://read-me.lol', 'wss://read-relay.com', 'wss://nostr-read-relay.example.com']
    )
  })
})