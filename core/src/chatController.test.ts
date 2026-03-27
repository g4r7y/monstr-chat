import { describe, test, expect, vi, type Mock, beforeEach, beforeAll } from 'vitest';
import { finalizeEvent, getPublicKey } from '@nostr/tools';
import { queryProfile } from '@nostr/tools/nip05';
import { decode, npubEncode } from '@nostr/tools/nip19';
import type { EventTemplate, SimplePool } from '@nostr/tools';

import { ChatControllerImpl, type ChatController } from './chatController.js';
import { ChatModel, type ChatAppData, type ChatContact, type ChatMessage } from './chatModel.js';
import type { KeyStore } from './keyStore.js';
import type { DataStore } from './dataStore.js';
import type { MessageListener } from './messageListener.js';
import type { SettingsListener } from './settingsListener.js';
import { receiveDms } from './nostrReceiveDm.js';
import { sendDm } from './nostrSendDm.js';
import { publishRelayListMetadata, subscribeToRelayListMetadata, getRelayListMetadata } from './nostrRelayMetadata.js';
import { publishUserMetadata, subscribeToUserMetadata, getUserMetadata } from './nostrUserMetadata.js';
import { normalizeURL } from '@nostr/tools/utils';

class TestDataStore implements DataStore {
  #appData: ChatAppData | null;
  #messages: ChatMessage[] | null;
  constructor() {
    this.#appData = null;
    this.#messages = null;
  }
  async readAppData() {
    return Promise.resolve(this.#appData);
  }
  async writeAppData(appData: ChatAppData) {
    this.#appData = structuredClone(appData);
  }
  async readMessages() {
    return Promise.resolve(this.#messages);
  }
  async writeMessages(messages: ChatMessage[]) {
    this.#messages = structuredClone(messages);
  }
}

const keyStoreMock: KeyStore = {
  readKey: vi.fn(),
  writeKey: vi.fn()
};

vi.mock('./chatModel.js', {
  spy: true
});

vi.mock('./nostrReceiveDm.js', () => ({
  receiveDms: vi.fn()
}));

vi.mock('./nostrSendDm.js', () => ({
  sendDm: vi.fn()
}));

vi.mock('./nostrRelayMetadata.js', async importOriginal => {
  const og = await importOriginal();
  return {
    publishRelayListMetadata: vi.fn(),
    subscribeToRelayListMetadata: vi.fn(),
    getRelayListMetadata: vi.fn(),
    extractDMRelaysFromEvent: (og as any).extractDMRelaysFromEvent // eslint-disable-line @typescript-eslint/no-explicit-any
  };
});

vi.mock('./nostrUserMetadata.js', async importOriginal => {
  const og = await importOriginal();
  return {
    publishUserMetadata: vi.fn(),
    subscribeToUserMetadata: vi.fn(),
    getUserMetadata: vi.fn(),
    extractContentFromUserMetadataEvent: (og as any).extractContentFromUserMetadataEvent // eslint-disable-line @typescript-eslint/no-explicit-any
  };
});

vi.mock('@nostr/tools/nip05', () => ({
  queryProfile: vi.fn()
}));

describe('chat controller', () => {
  describe('first startup', () => {
    let controller: ChatController;
    let model: ChatModel;

    beforeAll(() => {
      vi.resetAllMocks();
      // on first startup there is no key in keystore
      (keyStoreMock.readKey as Mock).mockResolvedValue(null);
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
    });

    test('initialise fails because no key', async () => {
      const initResult = await controller.init();
      expect(initResult).toBe(false);
    });

    test('create a new key', async () => {
      expect(() => controller.getNpub()).toThrowError('Keys not initialised');
      expect(() => controller.getNsec()).toThrowError('Keys not initialised');
      const bip39words = await controller.createNewKey();
      expect(bip39words.split(' ').length).toBe(12);
      expect(controller.getNpub()).toMatch(/npub1[0-9a-z]{43}/);
      expect(controller.getNsec()).toMatch(/nsec1[0-9a-z]{43}/);
      expect(keyStoreMock.writeKey).toBeCalledTimes(1);
      expect((keyStoreMock.writeKey as Mock).mock.calls[0][0]).toBe(controller.getNsec());
    });

    test('init succeeds after key creation', async () => {
      const initResult = await controller.init();
      expect(initResult).toBe(true);
      expect(model.load).toBeCalledTimes(1);
    });
  });

  describe('startup when has key', () => {
    let controller: ChatController;
    let model: ChatModel;
    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
    const privateKey = decode(nsec).data;
    const pubkey = getPublicKey(privateKey);

    beforeAll(() => {
      vi.resetAllMocks();
      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
    });

    test('initialise', async () => {
      const initResult = await controller.init();
      expect(initResult).toBe(true);
      expect(model.load).toBeCalledTimes(1);
    });

    test('get keys', () => {
      expect(controller.getNsec()).toEqual(nsec);
      const npub = npubEncode(pubkey);
      expect(controller.getNpub()).toEqual(npub);
    });

    test('connect', async () => {
      await controller.connect();

      const expectedRelaysForReceivingDm = controller.getSettings().inboxRelays;
      const expectedRelaysForOtherEvents = controller.getSettings().generalRelays;

      // should subscribe for message events
      expect(receiveDms).toBeCalledTimes(1);
      let args = (receiveDms as Mock).mock.calls[0];
      expect(args[0]).toEqual(pubkey);
      expect(args[1]).toEqual(privateKey);
      expect(args[3]).toEqual(
        expectedRelaysForReceivingDm.map(r => ({ url: normalizeURL(r), lastSeenTimestamp: undefined }))
      );
      // should subscribe for relay list events for our key
      expect(subscribeToRelayListMetadata).toBeCalledTimes(1);
      args = (subscribeToRelayListMetadata as Mock).mock.calls[0];
      expect(args[0]).toEqual([pubkey]);
      expect(args[2]).toEqual(expectedRelaysForOtherEvents);

      // should subscribe for user metadata events for our key (i.e. changes to user profile made elsewhere)
      expect(subscribeToUserMetadata).toBeCalledTimes(1);
      args = (subscribeToUserMetadata as Mock).mock.calls[0];
      expect(args[0]).toEqual([pubkey]);
      expect(args[2]).toEqual(expectedRelaysForOtherEvents);
    });
  });

  describe('reset key', () => {
    let controller: ChatController;
    let model: ChatModel;

    beforeAll(() => {
      vi.resetAllMocks();
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
    });

    test('reset key from nsec', async () => {
      (keyStoreMock.writeKey as Mock).mockClear();
      const nsec1 = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
      controller.resetKey(nsec1);
      expect(controller.getNsec()).toEqual(nsec1);
      expect(keyStoreMock.writeKey).toBeCalledTimes(1);
      expect((keyStoreMock.writeKey as Mock).mock.calls[0][0]).toBe(nsec1);
    });

    test('reset key from bip39', async () => {
      (keyStoreMock.writeKey as Mock).mockClear();
      const nsec2 = 'nsec10exkey3y824c63tdcn5zwhm6hwtj5gv5f8hez0ze6aujayk5hsfsmsmuze';
      const bip39words = 'inflict earn supply forget key stamp flame scan race rather effort jump'; //matches above key
      controller.resetKeyFromSeedWords(bip39words);
      expect(controller.getNsec()).toEqual(nsec2);
      expect(keyStoreMock.writeKey).toBeCalledTimes(1);
      expect((keyStoreMock.writeKey as Mock).mock.calls[0][0]).toBe(nsec2);
    });
  });

  describe('receive messages', () => {
    let controller: ChatController;
    let model: ChatModel;
    let onReceiveMessageCallback: (msg: ChatMessage, relaysSeenOn: string[]) => Promise<void>;

    const defaultRelays = ['wss://relay.damus.io/'];

    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
    const selfPrivateKey = decode(nsec).data;
    const selfPublicKey = getPublicKey(selfPrivateKey);
    const npub = npubEncode(selfPublicKey);

    const friendNpub = 'npub1dwzjk2ugu7c00dgvagmelvz0rvnxfflzetjj4t7da32w3y8yjclq3jwjm2';

    beforeAll(async () => {
      vi.resetAllMocks();
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);

      // configure receiveDms mock to store the controller's onMessage callback
      (receiveDms as Mock).mockImplementation(
        (pubkey, privateKey, pool, relays, onMessage: (msg: ChatMessage, relaysSeenOn: string[]) => Promise<void>) => {
          onReceiveMessageCallback = onMessage;
        }
      );

      await controller.init();
      await controller.connect();

      // ChatController.receiveDms should have been called
      expect((receiveDms as Mock).mock.calls.length).toBe(1);
      const args = (receiveDms as Mock).mock.calls[0];
      expect(args[0]).toEqual(selfPublicKey);
      expect(args[1]).toEqual(selfPrivateKey);
      expect(args[3]).toEqual(defaultRelays.map(r => ({ url: r, lastSeenTimestamp: undefined })));
      expect(onReceiveMessageCallback).toBeDefined();
    });

    test('conversation with contact', async () => {
      const timestamp = 1771289090648;
      // incoming message
      const msg1: ChatMessage = {
        id: 'id1',
        time: new Date(timestamp),
        text: 'incoming message from friend',
        sender: friendNpub,
        recipients: [npub],
        state: 'rx'
      };
      await onReceiveMessageCallback!(msg1, []);

      // incoming message
      const msg2: ChatMessage = {
        ...msg1,
        id: 'id2',
        time: new Date(timestamp - 10000) //oldest
      };
      await onReceiveMessageCallback!(msg2, []);

      // outgoing (sent) message from self
      const msg3: ChatMessage = {
        id: 'id3',
        time: new Date(timestamp + 10000),
        text: 'my reply',
        sender: npub,
        recipients: [friendNpub],
        state: 'tx'
      };
      await onReceiveMessageCallback!(msg3, []);

      const msg4 = {
        ...msg1,
        id: 'id4',
        time: new Date(timestamp + 20000) //newest
      };
      await onReceiveMessageCallback!(msg4, []);

      // check message conversation can be retrieved from model
      const chats = controller.getConversations();
      expect(chats.size).toBe(1);
      const chat = chats.get(friendNpub);
      expect(chat!.length).toBe(4);
      // should be in chronological order, newest first
      expect(chat![0]).toEqual(msg4);
      expect(chat![1]).toEqual(msg3);
      expect(chat![2]).toEqual(msg1);
      expect(chat![3]).toEqual(msg2);
    });

    test('duplicate message is ignored', async () => {
      const dupeMsg: ChatMessage = {
        id: 'id1', //same id as previous
        time: new Date(),
        text: 'has duplicate message id',
        sender: friendNpub,
        recipients: [npub],
        state: 'rx'
      };
      await onReceiveMessageCallback!(dupeMsg, []);

      const chats = controller.getConversations();
      expect(chats.size).toBe(1);
      const chat = chats.get(friendNpub);
      expect(chat!.length).toBe(4); //same as previous test
    });

    test('message from another contact', async () => {
      const friend2Npub = 'npub1xvfkvevgdk8h4jrcs509wrhfsl7na0xd7n2xnvw66gsyqn8dthks9wanpd';
      const msg: ChatMessage = {
        id: 'id5', //same id as previous
        time: new Date(),
        text: 'some message',
        sender: friend2Npub,
        recipients: [npub],
        state: 'rx'
      };
      await onReceiveMessageCallback!(msg, []);

      // should now be 2 conversations
      const chats = controller.getConversations();
      expect(chats.size).toBe(2);
      const chat = chats.get(friend2Npub);
      expect(chat!.length).toBe(1);
      expect(chat![0]).toEqual(msg);
    });

    test('message listener is triggered when receiving messages', async () => {
      const listener: MessageListener = {
        notifyMessage: vi.fn()
      };
      controller.addMessageListener(listener);

      const msg: ChatMessage = {
        id: 'id6',
        time: new Date(),
        text: 'the quick fox',
        sender: friendNpub,
        recipients: [npub],
        state: 'rx'
      };
      await onReceiveMessageCallback!(msg, []);

      expect(listener.notifyMessage).toBeCalledTimes(1);
      expect(listener.notifyMessage).toBeCalledWith(msg);

      controller.removeMessageListener(listener);

      (listener.notifyMessage as Mock).mockClear();
      const msg2 = {
        ...msg,
        id: 'id7'
      };
      await onReceiveMessageCallback!(msg2, []);

      expect(listener.notifyMessage).not.toBeCalled();
    });

    test('lastSeen time is updated when message is received', async () => {
      const timestamp = 1771288888;
      const msg: ChatMessage = {
        id: 'id10',
        time: new Date(timestamp * 1000),
        text: 'the quick fox',
        sender: friendNpub,
        recipients: [npub],
        state: 'rx'
      };

      // initially lastSeen timestamps won't be set
      expect(controller.getSettings().lastSeen).toBe(undefined);

      // receive a message'
      await onReceiveMessageCallback!(msg, [defaultRelays[0]]);

      // now the lastseen timestamp should be set
      const latestTimestamp = controller.getSettings().lastSeen!.dm![defaultRelays[0]];
      expect(latestTimestamp).toEqual(timestamp);
    });

    test('lastSeen time from settings is used when subscribing', async () => {
      controller.close();
      controller.connect();

      // ChatController.receiveDms should have been called again
      expect((receiveDms as Mock).mock.calls.length).toBe(2);
      const args = (receiveDms as Mock).mock.calls[1];
      // except this time it should have been called with the lastseen event timestamp
      expect(args[3]).toEqual(defaultRelays.map(r => ({ url: r, lastSeenTimestamp: 1771288888 })));
    });
  });

  describe('send messages', () => {
    let controller: ChatController;
    let model: ChatModel;

    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
    const selfPrivateKey = decode(nsec).data;
    const selfPublicKey = getPublicKey(selfPrivateKey);
    const npub = npubEncode(selfPublicKey);

    const friendNpub = 'npub1dwzjk2ugu7c00dgvagmelvz0rvnxfflzetjj4t7da32w3y8yjclq3jwjm2';
    const friendPubkey = decode(friendNpub).data;

    beforeAll(async () => {
      vi.resetAllMocks();
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);

      await controller.init();
      await controller.connect();
    });

    beforeEach(() => {
      (sendDm as Mock).mockClear();
      (getRelayListMetadata as Mock).mockClear();
    });

    test('send to contact', async () => {
      const expectedRelaysForReceivingDm = controller.getSettings().inboxRelays;

      const contact: ChatContact = {
        name: 'Steve',
        npub: friendNpub,
        relays: ['wss://relay1', 'wss://relay2']
      };

      await controller.sendDmToContact(contact, 'how now brown cow');

      expect(sendDm).toBeCalledTimes(1);
      const args = (sendDm as Mock).mock.calls[0];
      expect(args[0]).toEqual(selfPrivateKey);
      expect(args[3]).toEqual('how now brown cow');
      const recipients = args[1];

      // we send to recipient and also to ourself (so we get a copy of the sent message)
      expect(recipients.length).toBe(2);
      expect(recipients[0].pubKey).toEqual(friendPubkey);
      expect(recipients[0].relays).toEqual(contact.relays);
      expect(recipients[1].pubKey).toEqual(selfPublicKey);
      expect(recipients[1].relays).toEqual(expectedRelaysForReceivingDm);
    });

    test('send to self', async () => {
      const contact: ChatContact = {
        name: 'myself',
        npub: npub,
        relays: ['wss://relay1', 'wss://relay2']
      };

      await controller.sendDmToContact(contact, 'message to myself');

      expect(sendDm).toBeCalledTimes(1);
      const args = (sendDm as Mock).mock.calls[0];
      expect(args[0]).toEqual(selfPrivateKey);
      expect(args[3]).toEqual('message to myself');
      const recipients = args[1];

      // just the one recipient - ourself
      expect(recipients.length).toBe(1);
      expect(recipients[0].pubKey).toEqual(selfPublicKey);
      expect(recipients[0].relays).toEqual(contact.relays);
    });

    test('send to contact with missing relays, with successful DM relay lookup', async () => {
      const expectedRelaysForOtherEvents = controller.getSettings().generalRelays;
      const expectedRelaysForReceivingDm = controller.getSettings().inboxRelays;

      const contact: ChatContact = {
        name: 'Mystery man',
        npub: friendNpub,
        relays: [] //relays not defined
      };

      // simulate a relay list event containing relay metadata
      const relayListEvent: EventTemplate = {
        created_at: Math.floor(Date.now() / 1000),
        kind: 10050,
        tags: [
          ['relay', 'wss://read-me.lol'],
          ['relay', 'wss://read-relay.com']
        ],
        content: ''
      };
      (getRelayListMetadata as Mock).mockResolvedValue(relayListEvent);

      await controller.sendDmToContact(contact, 'how now brown cow');

      // relays are not defined for contact so getRelayListMetadata should be called to try and get them
      expect(getRelayListMetadata).toBeCalledTimes(1);
      let args = (getRelayListMetadata as Mock).mock.calls[0];
      expect(args[0]).toEqual(friendPubkey);
      expect(args[2]).toEqual(expectedRelaysForOtherEvents);

      expect(sendDm).toBeCalledTimes(1);
      args = (sendDm as Mock).mock.calls[0];
      expect(args[0]).toEqual(selfPrivateKey);
      expect(args[3]).toEqual('how now brown cow');

      // we send to recipient and also to ourself (so we get a copy of the sent message)
      const recipients = args[1];
      expect(recipients.length).toBe(2);
      expect(recipients[0].pubKey).toEqual(friendPubkey);
      expect(recipients[0].relays).toEqual(['wss://read-me.lol', 'wss://read-relay.com']); // should have sent to the recipient's DM relays
      expect(recipients[1].pubKey).toEqual(selfPublicKey);
      expect(recipients[1].relays).toEqual(expectedRelaysForReceivingDm);
    });

    test('send to contact with missing relays, fails relay list lookup', async () => {
      const contact: ChatContact = {
        name: 'Mystery man',
        npub: friendNpub,
        relays: [] //relays not defined
      };

      (getRelayListMetadata as Mock).mockResolvedValue(undefined);

      // expect send to throw
      await expect(controller.sendDmToContact(contact, 'hello')).rejects.toThrowError('NoRelay');

      expect(sendDm).not.toBeCalled();
    });
  });

  describe('contacts', () => {
    let controller: ChatController;
    let model: ChatModel;

    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';

    beforeAll(async () => {
      vi.resetAllMocks();

      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
      await controller.init();
      await controller.connect();
    });

    test('set and get contacts', () => {
      const contact1: ChatContact = {
        name: 'Rod',
        npub: 'npub1qan5qactkzmn3g3ee88mknhkq3r8yvsthfqrchmxxfm43x36eptst3w8cv',
        relays: []
      };
      const contact2 = {
        ...contact1,
        name: 'Jane',
        npub: 'npub1al0de7phghsqxyje4dn3lwya30akd255g0qt3xjdtreqhndtlm7quul2rj'
      };
      const contact3 = {
        ...contact1,
        name: 'Freddy',
        npub: 'npub1z7qa0cwpulrzg6yuj3cmm4pukxns5ak7fwdgmxlsgcmd6q0r537qcvq3nn'
      };

      controller.setContact(contact1);
      controller.setContact(contact2);
      controller.setContact(contact3);

      expect(controller.getContactByName('Jane')).toEqual(contact2);
      expect(controller.getContactByNpub('npub1z7qa0cwpulrzg6yuj3cmm4pukxns5ak7fwdgmxlsgcmd6q0r537qcvq3nn')).toEqual(
        contact3
      );

      const contactList = controller.getContactList();
      expect(contactList.length).toBe(3);
      expect(contactList[0]).toEqual(contact1);
      expect(contactList[1]).toEqual(contact2);
      expect(contactList[2]).toEqual(contact3);
    });

    test('delete contact', () => {
      controller.deleteContact('npub1al0de7phghsqxyje4dn3lwya30akd255g0qt3xjdtreqhndtlm7quul2rj');
      expect(controller.getContactList().length).toBe(2);
      expect(controller.getContactByNpub('npub1al0de7phghsqxyje4dn3lwya30akd255g0qt3xjdtreqhndtlm7quul2rj')).toBe(null);
      expect(controller.getContactByName('Jane')).toBe(null);

      controller.deleteContact('npub1qan5qactkzmn3g3ee88mknhkq3r8yvsthfqrchmxxfm43x36eptst3w8cv');
      controller.deleteContact('npub1z7qa0cwpulrzg6yuj3cmm4pukxns5ak7fwdgmxlsgcmd6q0r537qcvq3nn');
      expect(controller.getContactList().length).toBe(0);
    });
  });

  describe('user metadata', () => {
    let controller: ChatController;
    let model: ChatModel;

    let onUserMetadataCallback: (event: Event) => Promise<void>;

    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
    const privateKey = decode(nsec).data;
    const pubkey = getPublicKey(privateKey);

    beforeAll(async () => {
      vi.resetAllMocks();

      // when nostrUserMetadata mock is called we will grab the controller's callback
      (subscribeToUserMetadata as Mock).mockImplementation(
        (pubkeyList: string[], pool: SimplePool, relays: string[], callback: (event: Event) => Promise<void>) => {
          onUserMetadataCallback = callback;
        }
      );

      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
      await controller.init();
      await controller.connect();
    });

    test('user metadata event will update user profile', async () => {
      (subscribeToUserMetadata as Mock).mockClear();

      // re-subscribe (already did initial subscription on connect)
      await controller.subscribeToUserMetadata();

      // add a listener for notification of changes
      const listener: SettingsListener = {
        notifySettingsChanged: vi.fn()
      };
      controller.addSettingsListener(listener);

      // ensure the nostr subscription function was called for our key
      expect(subscribeToUserMetadata).toBeCalledTimes(1);
      expect((subscribeToUserMetadata as Mock).mock.calls[0][0]).toEqual([pubkey]);
      expect(onUserMetadataCallback).toBeDefined();

      const baseEvent = {
        created_at: 1771370000,
        kind: 0,
        tags: []
      };

      // set up mock for nip05 address query to simulate VALID nip05 address (profile query returns correct valid pubkey)
      (queryProfile as Mock).mockResolvedValue({
        pubkey
      });
      // simulate user metadata event
      let profile = {
        name: 'Bugs bunny',
        about: 'Rabbit',
        nip05: 'bugs@lol.com'
      };
      const event1 = {
        ...baseEvent,
        content: JSON.stringify(profile)
      };
      await onUserMetadataCallback(finalizeEvent(event1, privateKey));
      // settings should update and listener should be called
      expect(controller.getSettings().profile).toEqual(profile);
      expect(listener.notifySettingsChanged).toBeCalledTimes(1);

      // set up mock for nip05 address query to simulate INVALID nip05 address (profile query returns null)
      (queryProfile as Mock).mockResolvedValue(null);
      profile = {
        name: 'Bugs bunny',
        about: 'Bad Rabbit',
        nip05: 'bad_address@lol.com'
      };
      // simulate user metadata event
      const event2 = {
        ...baseEvent,
        content: JSON.stringify(profile)
      };
      await onUserMetadataCallback(finalizeEvent(event2, privateKey));
      // profile settings should be updated, but nip05 is removed; listener should be called again
      expect(controller.getSettings().profile).toEqual({ name: profile.name, about: profile.about });
      expect(listener.notifySettingsChanged).toBeCalledTimes(2);
    });

    test('user metadata event will update contact profile', async () => {
      const friendNsec = 'nsec1rnxq2yajeaaus04zu5t3a76dhg4rgtax9qgzzxwq097wxdkv3s8seslfa4';
      const friendPrivateKey = decode(friendNsec).data;
      const friendPubkey = getPublicKey(friendPrivateKey);
      const friendNpub = npubEncode(friendPubkey);

      const contact: ChatContact = {
        name: 'Steve',
        npub: friendNpub,
        relays: []
      };
      controller.setContact(contact);

      (subscribeToUserMetadata as Mock).mockClear();

      // re-subscribe
      await controller.subscribeToUserMetadata();

      // ensure the nostr subscription function was called for our key and contact's key
      expect(subscribeToUserMetadata).toBeCalledTimes(1);
      expect((subscribeToUserMetadata as Mock).mock.calls[0][0]).toEqual([friendPubkey, pubkey]);
      expect(onUserMetadataCallback).toBeDefined();

      const baseEvent = {
        created_at: 1771370000,
        kind: 0,
        tags: []
      };

      // set up mock for nip05 address query to simulate VALID nip05 address (profile query returns correct valid pubkey)
      (queryProfile as Mock).mockResolvedValue({
        pubkey: friendPubkey
      });
      // simulate a user metadata event
      let profile = {
        name: 'My name is Steve',
        about: 'I like cheese',
        nip05: 'steve@lol.com'
      };
      const event1 = {
        ...baseEvent,
        content: JSON.stringify(profile)
      };
      await onUserMetadataCallback(finalizeEvent(event1, friendPrivateKey));
      // contact's profile should be updated
      expect(controller.getContactByName('Steve')!.profile).toEqual(profile);

      // set up mock for nip05 address query to simulate INVALID nip05 address (profile query returns some random other key)
      (queryProfile as Mock).mockResolvedValue({
        pubkey: decode('npub1qnjcyscsu6sjf5q8cql2kwyyd4wlx09v62u2mf002xl04uand5aq7c8uf2').data
      });
      // simulate user metadata event
      profile = {
        name: 'I am Steve',
        about: 'I like cheese',
        nip05: 'bad_address@lol.com'
      };
      const event2 = {
        ...baseEvent,
        content: JSON.stringify(profile)
      };
      await onUserMetadataCallback(finalizeEvent(event2, friendPrivateKey));
      // contact's profile should be updated, but nip05 is removed
      expect(controller.getContactByName('Steve')!.profile).toEqual({ name: profile.name, about: profile.about });
    });

    test("can broadcast user's profile", async () => {
      controller.broadcastUserMetadata();

      expect(publishUserMetadata).toBeCalledTimes(1);
      const args = (publishUserMetadata as Mock).mock.calls[0];
      expect(args[0]).toEqual(pubkey);
      expect(args[1]).toEqual(privateKey);
      expect(args[3]).toEqual(controller.getSettings().generalRelays);
      expect(args[4]).toEqual(controller.getSettings().profile);
    });

    test('lookup a user profile', async () => {
      const friendNpub = 'npub1npzfgpgzfh85fhlpmr7j54g68q3u6wexx2pcpgcf8hgf6ff0srwqh2t0uy';
      const friendPubkey = decode(friendNpub).data;

      // mock a 'no event found' response from nostr query
      (getUserMetadata as Mock).mockResolvedValue(undefined);
      // lookup the remote user profile
      let result = await controller.lookupUserProfile(friendNpub);
      expect(getUserMetadata).toBeCalledTimes(1);
      expect((getUserMetadata as Mock).mock.calls[0][0]).toEqual(friendPubkey);
      expect((getUserMetadata as Mock).mock.calls[0][2]).toEqual(controller.getSettings().generalRelays);
      // expect not found
      expect(result).toBe(null);

      // mock a valid event from nostr query
      const profile = {
        name: 'Alice',
        about: 'from Wonderland',
        nip05: 'alice@nostr.com'
      };
      const event = {
        created_at: 1771370000,
        kind: 0,
        tags: [],
        content: JSON.stringify(profile)
      };
      (getUserMetadata as Mock).mockResolvedValue(event);
      // set up mock for nip05 address query to simulate VALID nip05 address (profile query returns correct valid pubkey)
      (queryProfile as Mock).mockResolvedValue({
        pubkey: friendPubkey
      });
      // lookup the remote user profile
      result = await controller.lookupUserProfile(friendNpub);
      // expect profile to be returned ok
      expect(result).toEqual(profile);

      // set up mock for nip05 address query to simulate INVALID nip05 address (profile query returns null)
      (queryProfile as Mock).mockResolvedValue(null);
      // lookup the remote user profile
      result = await controller.lookupUserProfile(friendNpub);
      // expect profile to be returned, but with null value for nip05
      expect(result).toEqual({ name: profile.name, about: profile.about });
    });
  });

  describe('relay metadata', () => {
    let controller: ChatController;
    let model: ChatModel;

    let onRelayMetadataCallback: (event: Event) => Promise<void>;

    const nsec = 'nsec1gex2hafvus99n06mut4ta6qt559ywy4yy6xyt3z6ye6z98zwyj4s90gft6';
    const privateKey = decode(nsec).data;
    const pubkey = getPublicKey(privateKey);

    beforeAll(async () => {
      vi.resetAllMocks();

      // when nostr subscription mock is called we will grab the controller's callback
      (subscribeToRelayListMetadata as Mock).mockImplementation(
        (pubkeyList: string[], pool: SimplePool, relays: string[], callback: (event: Event) => Promise<void>) => {
          onRelayMetadataCallback = callback;
        }
      );

      (keyStoreMock.readKey as Mock).mockResolvedValue(nsec);
      model = new ChatModel(new TestDataStore());
      controller = new ChatControllerImpl(model, keyStoreMock);
      await controller.init();
      await controller.connect();
    });

    test("relay metadata events update user's local relay settings", async () => {
      (subscribeToRelayListMetadata as Mock).mockClear();

      // re-subscribe to relay metadata events (already did initial subscription on connect)
      await controller.subscribeToRelayMetadata();

      // add a listener for notification of changes
      const listener: SettingsListener = {
        notifySettingsChanged: vi.fn()
      };
      controller.addSettingsListener(listener);

      // ensure the nostr subscription function was called for our key
      expect(subscribeToRelayListMetadata).toBeCalledTimes(1);
      expect((subscribeToRelayListMetadata as Mock).mock.calls[0][0]).toEqual([pubkey]);
      expect(onRelayMetadataCallback).toBeDefined();

      // simulate a relay list event containing relay metadata for our key
      const event1 = {
        created_at: 1771370000,
        kind: 10050,
        tags: [
          ['relay', 'wss://relay1.com'],
          ['relay', 'wss://relay111.lol']
        ],
        content: ''
      };
      await onRelayMetadataCallback(finalizeEvent(event1, privateKey));
      // settings should update and listener should be called
      expect(controller.getSettings().inboxRelays).toEqual(['wss://relay1.com', 'wss://relay111.lol']);
      expect(listener.notifySettingsChanged).toBeCalledTimes(1);

      // another relay list event containing same/older creation time
      const event2 = {
        ...event1,
        tags: [['relay', 'wss://relay0.com']]
      };
      await onRelayMetadataCallback(finalizeEvent(event2, privateKey));
      // should be ignored
      expect(controller.getSettings().inboxRelays).toEqual(['wss://relay1.com', 'wss://relay111.lol']);
      expect(listener.notifySettingsChanged).toBeCalledTimes(1);

      // another relay list event containing newer creation time, but unchanged relays
      const event3 = {
        ...event1,
        created_at: event1.created_at + 100
      };
      await onRelayMetadataCallback(finalizeEvent(event3, privateKey));
      // should be ignored
      expect(controller.getSettings().inboxRelays).toEqual(['wss://relay1.com', 'wss://relay111.lol']);
      expect(listener.notifySettingsChanged).toBeCalledTimes(1);

      // another relay list event containing newer creation time, and changed relays
      const event4 = {
        ...event1,
        created_at: event1.created_at + 100,
        tags: [['relay', 'wss://relay4.com']]
      };
      await onRelayMetadataCallback(finalizeEvent(event4, privateKey));
      // settings should update and listener should be called again
      expect(controller.getSettings().inboxRelays).toEqual(['wss://relay4.com']);
      expect(listener.notifySettingsChanged).toBeCalledTimes(2);

      // another changed relay list event, but this time we remove listener
      controller.removeSettingsListener(listener);
      const event5 = {
        ...event4,
        created_at: event4.created_at + 100,
        tags: [['relay', 'wss://relay5.com']]
      };
      await onRelayMetadataCallback(finalizeEvent(event5, privateKey));
      // settings should update but listener should not be called again
      expect(controller.getSettings().inboxRelays).toEqual(['wss://relay5.com']);
      expect(listener.notifySettingsChanged).toBeCalledTimes(2);
    });

    test('relay metadata events update relay settings for contacts', async () => {
      const friendNsec = 'nsec1rnxq2yajeaaus04zu5t3a76dhg4rgtax9qgzzxwq097wxdkv3s8seslfa4';
      const friendPrivateKey = decode(friendNsec).data;
      const friendPubkey = getPublicKey(friendPrivateKey);
      const friendNpub = npubEncode(friendPubkey);

      const contact: ChatContact = {
        name: 'Steve',
        npub: friendNpub,
        relays: []
      };
      controller.setContact(contact);

      (subscribeToRelayListMetadata as Mock).mockClear();

      // re-subscribe to relay metadata events
      await controller.subscribeToRelayMetadata();

      // ensure the nostr subscription function was called for our key and contact's key
      expect(subscribeToRelayListMetadata).toBeCalledTimes(1);
      expect((subscribeToRelayListMetadata as Mock).mock.calls[0][0]).toEqual([friendPubkey, pubkey]);
      expect(onRelayMetadataCallback).toBeDefined();

      // simulate a relay list event containing relay metadata for contact's key
      const event1 = {
        created_at: 1771370000,
        kind: 10050,
        tags: [
          ['relay', 'wss://relay1.com'],
          ['relay', 'wss://relay111.lol']
        ],
        content: ''
      };
      const relayListEvent = finalizeEvent(event1, friendPrivateKey);
      await onRelayMetadataCallback(relayListEvent);
      // contact should update
      expect(controller.getContactByName('Steve')?.relays).toEqual(['wss://relay1.com', 'wss://relay111.lol']);

      // another relay list event containing same/older creation time
      const event2 = {
        ...event1,
        tags: [['relay', 'wss://relay0.com']]
      };
      await onRelayMetadataCallback(finalizeEvent(event2, friendPrivateKey));
      // should be ignored
      expect(controller.getContactByName('Steve')?.relays).toEqual(['wss://relay1.com', 'wss://relay111.lol']);
    });

    test("can broadcast user's relay list", async () => {
      controller.broadcastRelayList();

      expect(publishRelayListMetadata).toBeCalledTimes(1);
      const args = (publishRelayListMetadata as Mock).mock.calls[0];
      expect(args[0]).toEqual(pubkey);
      expect(args[1]).toEqual(privateKey);
      expect(args[3]).toEqual(controller.getSettings().generalRelays);
      expect(args[4]).toEqual(controller.getSettings().inboxRelays);
    });
  });
});
