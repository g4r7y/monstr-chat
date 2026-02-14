import { test, describe } from 'node:test'
import assert from 'node:assert';
import { generateSecretKey, finalizeEvent, type EventTemplate  } from '@nostr/tools'
import { extractContentFromUserMetadataEvent } from './nostrUserMetadata.js'
import type { UserProfile } from './chatModel.js';

const createEvent = (content: string) : any => {
  const nsec = generateSecretKey(); // test private key
    const tempEv: EventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 0,
      tags: [],
      content,
    };
    const event = finalizeEvent(tempEv, nsec)
    return event
}

describe('user metadata', () => {
  test('extract user metadata from event', () => {
    const profile = { name: "fred", about: null, nip05: 'fred@lol.com' }
    const ev = createEvent(JSON.stringify(profile))
    const content = extractContentFromUserMetadataEvent(ev)
    assert.deepEqual(content, profile)
  })

  test('returns null if event contains invalid json', () => {
    const ev = createEvent('invalid')
    const content = extractContentFromUserMetadataEvent(ev)
    assert.equal(content, null)
  })

  test('returns null for missing properties', () => {
    const ev = createEvent(JSON.stringify( { NOTNAME: 'something', about: '', nippy: 'fred@lol.com' } ))
    const content = extractContentFromUserMetadataEvent(ev)
    assert.deepEqual(content, { name: null, about: '', nip05: null})
  })
})
