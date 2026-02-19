import { vi, test, describe, beforeEach, expect } from 'vitest';

import type { ChatMessage, ChatContact, ChatAppData, ChatSettings } from './chatModel.js';
import type { DataStore } from './dataStore.js';
import { ChatModel } from './chatModel.js';

const writeAppDataMock = vi.fn();
const writeMessagesMock = vi.fn();

let fakeDataStore: DataStore = {
  readAppData: async () => fakeAppData,
  writeAppData: writeAppDataMock,
  readMessages: async () => fakeMessages,
  writeMessages: writeMessagesMock
};

const someSettings: ChatSettings = {
  inboxRelays: [],
  generalRelays: [],
  relaysUpdatedAt: null,
  profile: null
};

let fakeAppData: ChatAppData | null = null;
let fakeMessages: ChatMessage[] | null = null;

describe('model', async () => {
  beforeEach(async t => {
    // ({ ChatModel } = await import('./chatModel.js'))
  });

  test('first load, without any app data', async () => {
    fakeAppData = null;
    fakeMessages = null;
    let model = new ChatModel(fakeDataStore);
    await model.load();

    //has some default settings
    expect(model.settings.generalRelays.length >= 1);
    expect(model.settings.inboxRelays.length >= 1);
    expect(model.settings.relaysUpdatedAt).toStrictEqual(null);
    expect(model.settings.profile).toStrictEqual(null);

    expect(model.getMessageList().length).toBe(0);
    expect(model.getContactList().length).toBe(0);
  });

  test('load messages', async () => {
    fakeAppData = {
      contacts: [],
      settings: someSettings
    };

    fakeMessages = [
      {
        sender: 'myself',
        receiver: 'npub1',
        text: 'conversation1 hello',
        time: new Date('2025-05-09T23:01:07.000Z'),
        id: 'msgId1',
        state: 'tx'
      },
      {
        sender: 'npub1',
        receiver: 'myself',
        text: 'conversation1 middle',
        time: new Date('2025-05-09T23:11:07.000Z'),
        id: 'msgId2',
        state: 'rx'
      },
      {
        sender: 'npub1',
        receiver: 'myself',
        text: 'conversation1 goodbye',
        time: new Date('2025-05-09T23:21:07.000Z'),
        id: 'msgId3',
        state: 'rx'
      }
    ];

    //
    let model = new ChatModel(fakeDataStore);
    await model.load();

    const msgs = model.getMessageList();
    expect(msgs.length).toBe(3);
    expect(msgs[0].text).toBe('conversation1 hello');
    expect(msgs[1].text).toBe('conversation1 middle');
    expect(msgs[2].text).toBe('conversation1 goodbye');
  });

  test('load contacts', async () => {
    const emptyContact = {
      name: null,
      npub: null,
      profile: null,
      relays: [],
      relaysUpdatedAt: null
    };

    fakeAppData = {
      contacts: [
        {
          ...emptyContact,
          name: 'Rod',
          npub: 'npub123'
        },
        {
          ...emptyContact,
          name: 'Freddy',
          npub: 'npub456'
        },
        {
          ...emptyContact,
          name: 'Jane',
          npub: 'npub789'
        }
      ],
      settings: someSettings
    };

    let model = new ChatModel(fakeDataStore);
    await model.load();

    const contacts = model.getContactList();
    expect(contacts.length).toBe(3);
    expect(contacts[0]).toEqual({
      ...emptyContact,
      name: 'Rod',
      npub: 'npub123'
    });
    expect(contacts[1]).toEqual({
      ...emptyContact,
      name: 'Freddy',
      npub: 'npub456'
    });
    expect(contacts[2]).toEqual({
      ...emptyContact,
      name: 'Jane',
      npub: 'npub789'
    });

    const foundContact = model.getContactByName('Freddy');
    expect(foundContact).toEqual({
      ...emptyContact,
      name: 'Freddy',
      npub: 'npub456'
    });
    const notFoundContact = model.getContactByName('zippy');
    expect(notFoundContact).toBe(null);
  });

  test('add message', async () => {
    writeMessagesMock.mockReset();

    let model = new ChatModel(fakeDataStore);

    // add a message
    const msg: ChatMessage = {
      id: '12345',
      time: new Date(),
      text: 'Greetings',
      sender: 'npub456',
      receiver: 'npub789',
      state: 'tx'
    };
    await model.setMessage(msg.id, msg);
    expect(model.getMessageList().length).toBe(1);
    expect(model.getMessageList()[0]).toEqual(msg);

    // messages is saved
    expect(writeMessagesMock.mock.calls.length).toBe(1);
    let messagesWrittenToMock = writeMessagesMock.mock.calls[0][0];
    expect(messagesWrittenToMock[0]).toEqual(msg);

    // get message
    let m_got = model.getMessage('bad_id');
    expect(m_got === null).toBeTruthy();
    m_got = model.getMessage('12345');
    expect(m_got).toEqual(msg);

    // can't mutate messae via getter
    m_got!.text = 'mutated greetings';
    let m_got2 = model.getMessage('12345');
    expect(m_got2!.text).toEqual('Greetings');

    // add another message
    const msg2 = {
      ...msg,
      id: '67890'
    };
    await model.setMessage(msg2.id, msg2);
    expect(model.getMessageList().length).toBe(2);
    expect(model.getMessageList()[0]).toEqual(msg);
    expect(model.getMessageList()[1]).toEqual(msg2);

    // both messages are saved
    expect(writeMessagesMock.mock.calls.length).toBe(2);
    messagesWrittenToMock = writeMessagesMock.mock.calls[1][0];
    expect(messagesWrittenToMock[0]).toEqual(msg);
    expect(messagesWrittenToMock[1]).toEqual(msg2);
  });

  test('add/get/edit/delete contact', async () => {
    writeAppDataMock.mockReset();

    let model = new ChatModel(fakeDataStore);

    // add a contact
    const c: ChatContact = {
      name: 'Fred',
      npub: 'npub456',
      profile: null,
      relays: [],
      relaysUpdatedAt: null
    };
    await model.setContact(c);
    expect(model.getContactList().length).toBe(1);
    expect(model.getContactList()[0]).toEqual(c);

    // data is saved
    expect(writeAppDataMock.mock.calls.length).toBe(1);
    expect(writeAppDataMock.mock.calls[0][0].contacts[0]).toEqual(c);

    // get contact by name
    let c_got = model.getContactByName('Non-existant');
    expect(c_got).toBe(null);
    c_got = model.getContactByName('Fred');
    expect(c_got).toEqual(c);

    // cannot mutate original via getter
    c_got!.npub = 'Mutated npub';
    let c_orig = model.getContactByName('Fred');
    expect(c_orig).toEqual(c);

    // get contact by name
    c_got = model.getContactByNpub('Non-existant');
    expect(c_got).toBe(null);
    c_got = model.getContactByNpub('npub456');
    expect(c_got).toEqual(c);

    // cannot mutate original via getter
    c_got!.name = 'Mutated Fred';
    c_orig = model.getContactByNpub('npub456');
    expect(c_orig).toEqual(c);

    // edit cotact
    c.name = 'Bob';
    await model.setContact(c);
    expect(model.getContactList().length).toBe(1);
    expect(model.getContactList()[0]).toEqual(c);

    // add another contact
    const c2: ChatContact = {
      name: 'Pip',
      npub: 'npub789',
      profile: null,
      relays: [],
      relaysUpdatedAt: null
    };
    await model.setContact(c2);
    expect(model.getContactList().length).toBe(2);
    expect(model.getContactList()[0]).toEqual(c);
    expect(model.getContactList()[1]).toEqual(c2);

    // delete contact
    await model.deleteContact(c.npub);
    expect(model.getContactList().length).toBe(1);
    expect(model.getContactList()[0]).toEqual(c2);
  });

  test('get/set settings', async () => {
    writeAppDataMock.mockReset();

    let model = new ChatModel(fakeDataStore);

    // defualt settings
    let s1 = model.settings as any;
    expect(s1.inboxRelays.length).toBe(1);
    expect(s1.generalRelays.length).toBe(4);

    // settings object is immutable via getter
    s1.someNewThing = 123;
    let s2 = model.settings as any;
    expect(s2.someNewThing === undefined).toBeTruthy();

    // set settings
    s1.inboxRelays.push('http://newrelay');
    model.setSettings(s1);

    // model is updated
    let s3 = model.settings as any;
    expect(s3.inboxRelays.length).toBe(2);
    expect(s3.inboxRelays[1]).toEqual('http://newrelay');
    expect(s3.someNewThing).toBe(123);

    // and data is saved
    expect(writeAppDataMock.mock.calls.length).toBe(1);
    expect(writeAppDataMock.mock.calls[0][0].settings).toEqual(s3);
  });
});
