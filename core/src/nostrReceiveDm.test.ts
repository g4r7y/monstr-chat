import { test, expect, vi, describe } from 'vitest'

import { getPublicKey, nip59, type Event, type EventTemplate } from '@nostr/tools';
import { decode, npubEncode } from '@nostr/tools/nip19';
import { SimplePool } from '@nostr/tools';
import { receiveDms } from './nostrReceiveDm.js';
import type { ChatMessage } from './chatModel.js';

const mockPoolSubscribe = vi.fn();

const simplePoolMock: Partial<SimplePool> = {
  subscribe: mockPoolSubscribe,
}

const createEvent = (content: string, friendPrivateKey: Uint8Array, receiverPubkey: string, selfPubKeys: string[]) => {
  const myEvent: EventTemplate = {
    created_at: new Date('2025-02-01T12:00:00.000Z').getTime() / 1000,
    kind: 14,
    tags: [],
    content
  }
  // may have multiple recipients on the message
  selfPubKeys.forEach(pubKey => {
    myEvent.tags.push(['p', pubKey])
  })
  const wrappedEvent = nip59.wrapEvent(myEvent, friendPrivateKey, receiverPubkey)
  return wrappedEvent
}

const selfPrivateKey = decode('nsec1aazfptzel9g83f7zy0zj9da7xz2sx2zuzkqklccxqjwsd66frunsz9g48k').data
const selfPubKey = getPublicKey(selfPrivateKey)
const friendPrivateKey = decode('nsec19h3h6sfee0r0qdusl9mhlk2eplhmweravd52uzcwcsla5x5rsymq9scyg6').data
const friendPubKey = getPublicKey(friendPrivateKey)

describe('receive DMs', () => {

  test('receive an incoming message', async () => {
    let onEventHandler: ((ev: Event) => void)

    mockPoolSubscribe.mockImplementation((relays, filter, params) => {
      onEventHandler = params.onevent;
    })
  

    let receivedMessage = null
    const messageReceivedCallback = async (message: ChatMessage) => {
      receivedMessage = message
    }
    
    // subscribe
    receiveDms(selfPubKey, selfPrivateKey, simplePoolMock as any, [ 'wss://myrelay' ], messageReceivedCallback)
    
    expect(onEventHandler!).toBeTruthy()
    // fake an incoming event from friend to ourself
    const event = createEvent('my message', friendPrivateKey, selfPubKey, [selfPubKey])
    await onEventHandler!(event as any)

    expect(receivedMessage).not.toBe(null)
    expect(receivedMessage!.text).toBe('my message')
    expect(receivedMessage!.receiver).toBe(npubEncode(selfPubKey))
    expect(receivedMessage!.sender).toBe(npubEncode(friendPubKey))
    expect(receivedMessage!.state).toBe('rx')
    expect(receivedMessage!.time).toEqual(new Date('2025-02-01T12:00:00.000Z'))

    mockPoolSubscribe.mockClear()
  })

  test('receive an outgoing message', async () => {
    let onEventHandler: ((ev: Event) => void)

    mockPoolSubscribe.mockImplementation((relays, filter, params) => {
      onEventHandler = params.onevent;
    })
  
    let receivedMessage = null
    const messageReceivedCallback = async (message: ChatMessage) => {
      receivedMessage = message
    }
    
    // subscribe
    receiveDms(selfPubKey, selfPrivateKey, simplePoolMock as any, [ 'wss://myrelay' ], messageReceivedCallback)
    
    expect(onEventHandler!).toBeTruthy()
    // fake a sent message event from self to friend + self 
    const event = createEvent('my message', selfPrivateKey, selfPubKey, [friendPubKey, selfPubKey] )
    await onEventHandler!(event as any)

    expect(receivedMessage).not.toBe(null)
    expect(receivedMessage!.text).toBe('my message')
    expect(receivedMessage!.receiver).toBe(npubEncode(friendPubKey))
    expect(receivedMessage!.sender).toBe(npubEncode(selfPubKey))
    expect(receivedMessage!.state).toBe('tx')
    expect(receivedMessage!.time).toEqual(new Date('2025-02-01T12:00:00.000Z'))

    mockPoolSubscribe.mockClear()
  })

})