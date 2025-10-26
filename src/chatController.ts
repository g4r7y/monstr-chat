
import { generateSecretKey, getPublicKey } from '@nostr/tools'

import { nsecEncode, npubEncode, decode, neventEncode } from '@nostr/tools/nip19'
import { Relay } from '@nostr/tools/relay'

import { red, green, yellow } from '@std/fmt/colors'

import { subscribeToIncomingDms, sendDm, subscribeToRelayListMetadata } from './nostrDm.js'
import ChatUi from './chatUi.js'
import { ChatModel, ChatMessage } from './chatModel.js'
import { readKey, writeKey } from './localStore.js'

class ChatController {
  #npub: string
  #nsec: Uint8Array
  #model: ChatModel
  #ui: ChatUi
  #connectedRelays : Relay[]

  constructor() {
    this.#npub = ''
    this.#nsec = new Uint8Array()

    this.#model = new ChatModel()
    this.#ui = new ChatUi(this, this.#model)
    this.#connectedRelays = []
  }

  
  async run() {
    console.log(green('hello'))

    // try and read key from store
    let nsecStr = await readKey()
    if (nsecStr) {
      const decoded = decode(nsecStr)
      if (decoded.type === 'nsec' && decoded.data) {
        this.#nsec = decoded.data as Uint8Array
      }
    }

    if (this.#nsec.length == 0) {
      console.log('No existing key. Generating a new private key...')
      this.#nsec = generateSecretKey()
      await writeKey(nsecEncode(this.#nsec ))
    }
    
    this.#npub = getPublicKey(this.#nsec)
    
    console.log(yellow('npub: ' + npubEncode(this.#npub)))
    console.log(red('nsec: ' + nsecEncode(this.#nsec)))

    await this.#model.load()
    
    let connError = false

    // connect to inbox relays
    for (let relayUrl of this.#model.settings.inboxRelays) {
      console.log('about to connect to ' , relayUrl)
      try {
        const relay = await Relay.connect(relayUrl)
        console.log(`connected to ${relay.url}`)
        this.#connectedRelays.push(relay)
      } catch (err) {
        console.log(`Failed to connect to relay ${relayUrl}. Error: ${err}`)
        connError = true
      }
    }
    
    // subscribe to receive DMs from inbox relays
    for (let i = 0; i < this.#connectedRelays.length; i++) {
      console.log(`Subscribing to incoming DMs from relay: ${this.#connectedRelays[i].url}`)
      await subscribeToIncomingDms(this.#npub, this.#nsec, this.#connectedRelays[i], (msg: ChatMessage) => this.#onIncoming(msg))

      // console.log(`Subscribing to relay metadata from relay: ${this.#connectedRelays[i].url}`)
      // await subscribeToRelayListMetadata([this.#npub], this.#connectedRelays[i], () => {})
    }
    
    // wait
    const sleep = (ms: number) => {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    }

    await sleep(100)
    if (connError) {
      await this.#ui.go('offline')
    } else {
      await this.#ui.go()
    }
    
    this.#connectedRelays.forEach(relay => relay.close())
  }

  async sendDm(recipientNpub: string, text: string) {
    const recipientPubKey = decode(recipientNpub).data as string
    const sentMsg = await sendDm(this.#npub, this.#nsec, recipientPubKey, this.#connectedRelays[0], text)
    if (sentMsg) {
      await this.#model.setMessage(sentMsg.id, sentMsg)
    }
  }

  getPubKeyString() : string {
    return npubEncode(this.#npub)
  }

  getSecretKeyString() : string {
    return nsecEncode(this.#nsec)
  }
  
  #onIncoming(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      this.#model.setMessage(msg.id, msg) //todo async?
      this.#ui.newMessage(msg)
    }
  }


}

export default ChatController