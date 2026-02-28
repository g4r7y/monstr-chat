import { expect, test, describe } from 'vitest';
import { generateSecretKey, finalizeEvent, type EventTemplate } from '@nostr/tools';
import { extractDMRelaysFromEvent } from './nostrRelayMetadata.js';

describe('relay metadata', () => {
  test('extract relays', () => {
    const nsec = generateSecretKey(); // test private key
    const tempEv: EventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 10050,
      tags: [['r'], ['relay', 'wss://read-me.lol'], ['relay', 'wss://read-relay.com'], ['?', 'some crap', 'blah'], []],
      content: ''
    };

    const ev = finalizeEvent(tempEv, nsec);

    const extractedReadRelays = extractDMRelaysFromEvent(ev);
    expect(extractedReadRelays).toEqual(['wss://read-me.lol', 'wss://read-relay.com']);
  });
});
