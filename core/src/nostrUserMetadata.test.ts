import { test, describe, expect } from 'vitest';
import { generateSecretKey, finalizeEvent, type EventTemplate, type Event } from '@nostr/tools';
import { extractContentFromUserMetadataEvent } from './nostrUserMetadata.js';

const createEvent = (content: string): Event => {
  const privateKey = generateSecretKey();
  const tempEv: EventTemplate = {
    created_at: Math.floor(Date.now() / 1000),
    kind: 0,
    tags: [],
    content
  };
  const event = finalizeEvent(tempEv, privateKey);
  return event;
};

describe('user metadata', () => {
  test('extract user metadata from event', () => {
    const profile = {
      name: 'fred',
      about: null,
      nip05: 'fred@lol.com'
    };
    const ev = createEvent(JSON.stringify(profile));
    const content = extractContentFromUserMetadataEvent(ev);
    expect(content).toEqual(profile);
  });

  test('returns null if event contains invalid json', () => {
    const ev = createEvent('invalid');
    const content = extractContentFromUserMetadataEvent(ev);
    expect(content).toBe(null);
  });

  test('returns null for missing properties', () => {
    const ev = createEvent(
      JSON.stringify({
        NOTNAME: 'something',
        about: '',
        nippy: 'fred@lol.com'
      })
    );
    const content = extractContentFromUserMetadataEvent(ev);
    expect(content).toEqual({
      name: null,
      about: '',
      nip05: null
    });
  });
});
