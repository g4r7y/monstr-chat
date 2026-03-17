import { test, expect, vi, describe } from 'vitest';

import { getPublicKey, nip59, type Event, type EventTemplate } from '@nostr/tools';
import { decode, npubEncode } from '@nostr/tools/nip19';
import { SimplePool } from '@nostr/tools';
import { receiveDms } from './nostrReceiveDm.js';
import type { AbstractRelay } from '@nostr/tools/abstract-relay';
import { Relay } from '@nostr/tools';

// mock the nostr-tools api
const mockPoolSubscribe = vi.fn();
const simplePoolMock: Partial<SimplePool> = {
  subscribeMap: mockPoolSubscribe,
  seenOn: new Map()
};

const createEvent = (content: string, friendPrivateKey: Uint8Array, receiverPubkey: string, selfPubKeys: string[]) => {
  const myEvent: EventTemplate = {
    created_at: new Date('2025-02-01T12:00:00.000Z').getTime() / 1000,
    kind: 14,
    tags: [],
    content
  };
  // may have multiple recipients on the message
  selfPubKeys.forEach(pubKey => {
    myEvent.tags.push(['p', pubKey]);
  });
  const wrappedEvent = nip59.wrapEvent(myEvent, friendPrivateKey, receiverPubkey);
  return wrappedEvent;
};

const selfPrivateKey = decode('nsec1aazfptzel9g83f7zy0zj9da7xz2sx2zuzkqklccxqjwsd66frunsz9g48k').data;
const selfPubKey = getPublicKey(selfPrivateKey);
const friendPrivateKey = decode('nsec19h3h6sfee0r0qdusl9mhlk2eplhmweravd52uzcwcsla5x5rsymq9scyg6').data;
const friendPubKey = getPublicKey(friendPrivateKey);

describe('receive DMs', () => {
  test('receive an incoming message', async () => {
    // capture the callback passed to pool.subscribeMap(). we will use this to simulate a received event
    let onEventHandler: (ev: Event) => void;
    mockPoolSubscribe.mockImplementation((requests, params) => {
      onEventHandler = params.onevent;
    });

    // subscribe
    const messageReceivedCallback = vi.fn();
    receiveDms(
      selfPubKey,
      selfPrivateKey,
      simplePoolMock as SimplePool,
      [{ url: 'https://myrelay', lastSeenTimestamp: 1773000000 }],
      messageReceivedCallback
    );

    // verify nostr-tools subscription api called with correct relays and filters
    expect(mockPoolSubscribe.mock.calls.length).toBe(1);
    const firstArg = mockPoolSubscribe.mock.calls[0][0];
    expect(firstArg).toStrictEqual([
      {
        url: 'wss://myrelay/',
        filter: {
          '#p': [selfPubKey],
          kinds: [1059],
          since: 1773000000
        }
      }
    ]);
    expect(onEventHandler!).toBeTruthy();

    // create an incoming event from friend to ourself
    const event = createEvent('my message', friendPrivateKey, selfPubKey, [selfPubKey]);

    // set the mock pool to have seen our message
    const fakeRelay: AbstractRelay = new Relay('wss://myrelay/');
    const relaySet = new Set<AbstractRelay>();
    relaySet.add(fakeRelay);
    simplePoolMock!.seenOn!.set(event.id, relaySet);

    // simulate the pool receiving an event
    await onEventHandler!(event);

    // verify our callback was called with expected message
    expect(messageReceivedCallback.mock.calls.length).toBe(1);
    const receivedMessage = messageReceivedCallback.mock.calls[0][0];
    const relaysSeenOn = messageReceivedCallback.mock.calls[0][1];
    expect(receivedMessage).not.toBe(null);
    expect(receivedMessage!.text).toBe('my message');
    expect(receivedMessage!.receiver).toBe(npubEncode(selfPubKey));
    expect(receivedMessage!.sender).toBe(npubEncode(friendPubKey));
    expect(receivedMessage!.state).toBe('rx');
    expect(receivedMessage!.time).toEqual(new Date('2025-02-01T12:00:00.000Z'));

    // verify that pool is used correctly to pass relaysSeenOn to callback
    expect(relaysSeenOn!.length).toBe(1);
    expect(relaysSeenOn![0]).toBe('wss://myrelay/');

    mockPoolSubscribe.mockClear();
  });

  test('receive an outgoing message', async () => {
    // capture the callback passed to pool.subscribeMap(). we will use this to simulate a received event
    let onEventHandler: (ev: Event) => void;
    mockPoolSubscribe.mockImplementation((requests, params) => {
      onEventHandler = params.onevent;
    });

    // subscribe
    const messageReceivedCallback = vi.fn();
    receiveDms(
      selfPubKey,
      selfPrivateKey,
      simplePoolMock as SimplePool,
      [{ url: 'https://a-relay/' }],
      messageReceivedCallback
    );

    // verify nostr-tools subscription api called with correct relays and filters
    expect(mockPoolSubscribe.mock.calls.length).toBe(1);
    const firstArg = mockPoolSubscribe.mock.calls[0][0];
    expect(firstArg).toStrictEqual([
      {
        url: 'wss://a-relay/',
        filter: {
          '#p': [selfPubKey],
          kinds: [1059]
        }
      }
    ]);
    expect(onEventHandler!).toBeTruthy();

    // create a sent message event from self to friend + self
    const event = createEvent('my message', selfPrivateKey, selfPubKey, [friendPubKey, selfPubKey]);

    // set the mock pool to have seen our message
    const fakeRelay: AbstractRelay = new Relay('wss://a-relay/');
    const relaySet = new Set<AbstractRelay>();
    relaySet.add(fakeRelay);
    simplePoolMock!.seenOn!.set(event.id, relaySet);

    // simulate the pool receiving the event
    await onEventHandler!(event);

    // verify our callback was called with expected message
    expect(messageReceivedCallback.mock.calls.length).toBe(1);
    const receivedMessage = messageReceivedCallback.mock.calls[0][0];
    const relaysSeenOn = messageReceivedCallback.mock.calls[0][1];
    expect(receivedMessage).not.toBe(null);
    expect(receivedMessage!.text).toBe('my message');
    expect(receivedMessage!.receiver).toBe(npubEncode(friendPubKey));
    expect(receivedMessage!.sender).toBe(npubEncode(selfPubKey));
    expect(receivedMessage!.state).toBe('tx');
    expect(receivedMessage!.time).toEqual(new Date('2025-02-01T12:00:00.000Z'));

    // verify that pool is used correctly to pass relaysSeenOn to callback
    expect(relaysSeenOn!.length).toBe(1);
    expect(relaysSeenOn![0]).toBe('wss://a-relay/');

    mockPoolSubscribe.mockClear();
  });
});
