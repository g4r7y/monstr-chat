import { mock, test, describe, beforeEach, TestContext } from 'node:test'
import { ChatMessage, ChatContact, ChatAppData, ChatSettings } from './chatModel.js'
import assert from 'node:assert'
import DataStore from './dataStore.js'


// lazy load ChatModel so that its mocked dependencies are setup first
let ChatModel: new(dataStore: DataStore)=>any

const writeAppDataMock = mock.fn()
const writeMessagesMock = mock.fn()

let fakeDataStore : DataStore = {
  readAppData: async () => fakeAppData, 
  writeAppData: writeAppDataMock,
  readMessages: async () => fakeMessages, 
  writeMessages: writeMessagesMock
}

const someSettings: ChatSettings = {
  inboxRelays: [],
  generalRelays: [],
  relaysUpdatedAt: null,
  nip05: null,
  profileName: null,
  profileAbout: null,
}

let fakeAppData: ChatAppData | null = null
let fakeMessages: ChatMessage[] | null = null


describe('model', async () => {

  beforeEach(async (t) => {
    ({ ChatModel } = await import('./chatModel.js'))
  })

  test('first load, without any app data', async (t: TestContext) => {
    fakeAppData = null
    fakeMessages = null
    let model = new ChatModel(fakeDataStore)
    await model.load()

    //has some default settings
    assert(model.settings.generalRelays.length > 1)
    assert(model.settings.inboxRelays.length > 1)
    assert.strictEqual(model.settings.relaysUpdatedAt, null)
    assert.strictEqual(model.settings.nip05, null)
    assert.strictEqual(model.settings.profileName, null)
    assert.strictEqual(model.settings.profileAbout, null)

    assert.equal(model.getMessageList().length, 0)
    assert.equal(model.getContactList().length, 0)
  })

  
  test('load messages', async () => {
    fakeAppData = { 
        contacts: [], 
        settings: someSettings,
      }

    fakeMessages = [
      // conversation 1...........
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
    
      // convo 2...........
      {
        sender: 'npub2',
        receiver: 'myself',
        text: 'conversation2 goodbye',
        time: new Date('2025-05-09T20:11:07.000Z'),
        id: 'msgId5',
        state: 'rx'
      },
      {
        sender: 'myself',
        receiver: 'npub2',
        text: 'conversation2 hello',
        time: new Date('2025-05-09T20:01:07.000Z'),
        id: 'msgId4',
        state: 'tx'
      },

      // more from conversation 1
      {
        sender: 'npub1',
        receiver: 'myself',
        text: 'conversation1 goodbye',
        time: new Date('2025-05-09T23:21:07.000Z'),
        id: 'msgId3',
        state: 'rx'
      },
    ]

    //
    let model = new ChatModel(fakeDataStore)
    await model.load()

    const msgs = model.getMessageList()
    assert.equal(msgs.length, 5)

    const convs = model.getConversations()
    assert.equal(convs.size, 2) // 2 conversations
    const entries = convs.entries()
    // conversation1
    let [key, msgList] = entries.next().value
    assert.equal(key, 'npub1')
    assert.equal(msgList.length, 3)
    assert.equal(msgList[0].text, 'conversation1 goodbye')
    assert.equal(msgList[1].text, 'conversation1 middle')
    assert.equal(msgList[2].text, 'conversation1 hello')
    // conversation2
    ;[key, msgList] = entries.next().value
    assert.equal(key, 'npub2')
    assert.equal(msgList.length, 2) 
    assert.equal(msgList[0].text, 'conversation2 goodbye')
    assert.equal(msgList[1].text, 'conversation2 hello')
  })

  test('load contacts', async () => {
    const emptyContact = {
      name: null,
      npub: null,
      nip05: null,
      profileAbout: null,
      profileName: null,
      relays: [],
      relaysUpdatedAt: null
    }

    fakeAppData = { 
      contacts: [
        {
          ...emptyContact,
          name: "Rod",
          npub: "npub123",
        },
        {
          ...emptyContact,
          name: "Freddy",
          npub: "npub456"
        },
        {
          ...emptyContact,
          name: "Jane",
          npub: "npub789"
        },
      ],
      settings: someSettings
    }

    let model = new ChatModel(fakeDataStore)
    await model.load()

    const contacts = model.getContactList()
    assert.equal(contacts.length, 3)
    assert.deepEqual(contacts[0], { ...emptyContact, name: 'Rod', npub: 'npub123'})
    assert.deepEqual(contacts[1], { ...emptyContact, name: 'Freddy', npub: 'npub456'})
    assert.deepEqual(contacts[2], { ...emptyContact, name: 'Jane', npub: 'npub789'})

    const foundContact = model.getContactByName('Freddy')
    assert.deepEqual(foundContact, { ...emptyContact, name: 'Freddy', npub: 'npub456'})
    const notFoundContact = model.getContactByName('zippy')
    assert.equal(notFoundContact, null)
  })

  test('add message', async () => {
    writeMessagesMock.mock.resetCalls()
      
    let model = new ChatModel(fakeDataStore)

    // add a message
    const msg: ChatMessage = {
      id: '12345',
      time: new Date(),
      text: 'Greetings',
      sender: 'npub456',
      receiver: 'npub789',
      state: 'tx'
    }
    await model.setMessage(msg.id, msg)
    assert.equal(model.getMessageList().length, 1)
    assert.deepEqual(model.getMessageList()[0], msg)

    // messages is saved
    assert.equal(writeMessagesMock.mock.callCount(), 1)
    let messagesWrittenToMock = writeMessagesMock.mock.calls[0].arguments[0]
    assert.deepEqual(messagesWrittenToMock[0], msg)

    // get message
    let m_got = model.getMessage('bad_id')
    assert.ok(m_got === null)
    m_got = model.getMessage('12345')
    assert.deepEqual(m_got, msg)

    // can't mutate messae via getter
    m_got.text = 'mutated greetings'
    let m_got2 = model.getMessage('12345')
    assert.deepEqual(m_got2.text, 'Greetings')


    // add another message
    const msg2 = {...msg, id: '67890'}
    await model.setMessage(msg2.id, msg2)
    assert.equal(model.getMessageList().length, 2)
    assert.deepEqual(model.getMessageList()[0], msg)
    assert.deepEqual(model.getMessageList()[1], msg2)

    // both messages are saved
    assert.equal(writeMessagesMock.mock.callCount(), 2)
    messagesWrittenToMock = writeMessagesMock.mock.calls[1].arguments[0]
    assert.deepEqual(messagesWrittenToMock[0], msg)
    assert.deepEqual(messagesWrittenToMock[1], msg2)
  })

  test('add/get/edit/delete contact', async () => {
    writeAppDataMock.mock.resetCalls()
      
    let model = new ChatModel(fakeDataStore)

    // add a contact
    const c: ChatContact = { name: 'Fred', npub: 'npub456', nip05: null, relays: [], relaysUpdatedAt: null, profileName: null, profileAbout: null  }
    await model.setContact(c)
    assert.equal(model.getContactList().length, 1)
    assert.deepEqual(model.getContactList()[0], c)

    // data is saved
    assert.equal(writeAppDataMock.mock.callCount(), 1)
    assert.deepEqual(writeAppDataMock.mock.calls[0].arguments[0].contacts[0], c)

    // get contact by name
    let c_got = model.getContactByName('Non-existant')
    assert.equal(c_got, null)
    c_got = model.getContactByName('Fred')
    assert.deepEqual(c_got, c)

    // cannot mutate original via getter
    c_got.npub = 'Mutated npub'
    let c_orig = model.getContactByName('Fred')
    assert.deepEqual(c_orig, c)

    // get contact by name
    c_got = model.getContactByNpub('Non-existant')
    assert.equal(c_got, null)
    c_got = model.getContactByNpub('npub456')
    assert.deepEqual(c_got, c)

    // cannot mutate original via getter
    c_got.name = 'Mutated Fred'
    c_orig = model.getContactByNpub('npub456')
    assert.deepEqual(c_orig, c)

    // edit cotact
    c.name = 'Bob'
    await model.setContact(c)
    assert.equal(model.getContactList().length, 1)
    assert.deepEqual(model.getContactList()[0], c)
    
    // add another contact
    const c2: ChatContact = { name: 'Pip', npub: 'npub789', nip05: null, relays: [], relaysUpdatedAt: null, profileName: null, profileAbout: null }
    await model.setContact(c2)
    assert.equal(model.getContactList().length, 2)
    assert.deepEqual(model.getContactList()[0], c)
    assert.deepEqual(model.getContactList()[1], c2)

    // delete contact
    await model.deleteContact(c.npub)
    assert.equal(model.getContactList().length, 1)
    assert.deepEqual(model.getContactList()[0], c2)
  })

  test('get/set settings', async () => {
    writeAppDataMock.mock.resetCalls()

    let model = new ChatModel(fakeDataStore)

    // defualt settings
    let s1 = model.settings
    assert.equal(s1.inboxRelays.length, 2)
    assert.equal(s1.generalRelays.length, 6)
    
    // settings object is immutable via getter
    s1.someNewThing = 123
    let s2 = model.settings
    assert.ok(s2.someNewThing === undefined)

    // set settings
    s1.inboxRelays.push('http://newrelay')
    model.setSettings(s1)

    // model is updated
    let s3 = model.settings
    assert.equal(s3.inboxRelays.length, 3)
    assert.equal(s3.inboxRelays[2], 'http://newrelay')
    assert.equal(s3.someNewThing, 123)

    // and data is saved
    assert.equal(writeAppDataMock.mock.callCount(), 1)
    assert.deepEqual(writeAppDataMock.mock.calls[0].arguments[0].settings, s3)

  })

})