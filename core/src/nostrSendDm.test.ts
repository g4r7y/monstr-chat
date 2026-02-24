import { test, expect, vi, describe } from 'vitest';

import { sendDm, type SendDmRecipient } from './nostrSendDm.js';
import { getPublicKey, type UnsignedEvent } from '@nostr/tools';
import { decode } from '@nostr/tools/nip19';
import { SimplePool } from '@nostr/tools';
import { unwrapEvent } from '@nostr/tools/nip59';

const mockPoolPublish = vi.fn();

const simplePoolMock: Partial<SimplePool> = {
  publish: mockPoolPublish
};

describe('send dm', () => {
  mockPoolPublish.mockImplementation(() => {
    return [Promise.resolve('')];
  });

  const senderPrivateKey = decode('nsec19h3h6sfee0r0qdusl9mhlk2eplhmweravd52uzcwcsla5x5rsymq9scyg6').data;
  const senderPubkey = getPublicKey(senderPrivateKey);

  test('send to single recipient', async () => {
    const recipient1PrivateKey = decode('nsec1aazfptzel9g83f7zy0zj9da7xz2sx2zuzkqklccxqjwsd66frunsz9g48k').data;
    const recipient1PubKey = getPublicKey(recipient1PrivateKey);

    const recipients: SendDmRecipient[] = [
      {
        pubKey: recipient1PubKey,
        relays: ['wss://relay']
      }
    ];
    await sendDm(senderPrivateKey, recipients, simplePoolMock as SimplePool, 'My message');

    // just one recipient so expect one call to SimplePool.publish()
    expect(mockPoolPublish.mock.calls.length).toBe(1);

    const relaysUsedForPublish = mockPoolPublish.mock.calls[0][0];
    expect(relaysUsedForPublish).toEqual(recipients[0].relays);

    const publishedEvent = mockPoolPublish.mock.calls[0][1];
    expect(publishedEvent.kind).toBe(1059);
    expect(publishedEvent.tags.length).toBe(1);
    expect(publishedEvent.tags[0]).toEqual(['p', recipient1PubKey]);

    // unwrap/decrypt the event to check the original content
    type PlainEventWithId = UnsignedEvent & {
      id: string;
    };
    const plainEvent: PlainEventWithId = await unwrapEvent(publishedEvent, recipient1PrivateKey);
    expect(plainEvent.content).toEqual('My message');
    expect(plainEvent.pubkey).toEqual(senderPubkey);
    expect(plainEvent.tags.length).toBe(1);
    expect(plainEvent.tags[0]).toEqual(['p', recipient1PubKey]);

    mockPoolPublish.mockClear();
  });

  test('send to multiple recipients', async () => {
    const recipientPrivateKeys = [
      'nsec1g5q2t2v93s6n6v9mgctll74wp6edp2dh2ap0xds6sjlrgfxnzjsq4j3kg7',
      'nsec1ncwm3zwf8g409ukctz720c90dnjce5yvdfpvgfgkwq4h3tny3ndsnm5fnm',
      'nsec177gvdvucsr3ewnheluhdpdxcmg9qjjn6l3fl2vgv7u6zskkxgpysta4l3f'
    ].map(nsec => decode(nsec).data as Uint8Array);
    const recipientPubkeys = recipientPrivateKeys.map(privateKey => getPublicKey(privateKey));

    const recipients: SendDmRecipient[] = recipientPubkeys.map((pubKey, i) => ({
      pubKey,
      relays: [`wss://relay${i}`]
    }));
    await sendDm(senderPrivateKey, recipients, simplePoolMock as SimplePool, 'My group message');

    // SimplePool.publish() called for each recipient
    expect(mockPoolPublish.mock.calls.length).toBe(3);

    // check each call to SimplePool publish
    for (const i in recipients) {
      const callArgs = mockPoolPublish.mock.calls[i];
      const relaysUsedForPublish = callArgs[0];
      expect(relaysUsedForPublish).toEqual(recipients[i].relays);

      // Get the wrapped event published to current recipient
      const publishedEvent = callArgs[1];
      expect(publishedEvent.kind).toBe(1059);
      // wrapped event should only have p tag for the receiver
      expect(publishedEvent.tags.length).toBe(1);
      expect(publishedEvent.tags[0]).toEqual(['p', recipientPubkeys[i]]);

      // Unwrap/decrypt the event to check the original content
      type PlainEventWithId = UnsignedEvent & {
        id: string;
      };
      const plainEvent: PlainEventWithId = unwrapEvent(publishedEvent, recipientPrivateKeys[i]);
      expect(plainEvent.content).toEqual('My group message');
      expect(plainEvent.pubkey).toEqual(senderPubkey);
      // unwrapped event should have a p tag for *all* the recipients in the group
      expect(plainEvent.tags.length).toBe(3);
      expect(plainEvent.tags[0]).toEqual(['p', recipientPubkeys[0]]);
      expect(plainEvent.tags[1]).toEqual(['p', recipientPubkeys[1]]);
      expect(plainEvent.tags[2]).toEqual(['p', recipientPubkeys[2]]);
    }

    mockPoolPublish.mockClear();
  });
});
