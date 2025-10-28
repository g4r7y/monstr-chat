
import { generateSecretKey, getPublicKey } from '@nostr/tools'

import { nsecEncode, npubEncode, decode, neventEncode } from '@nostr/tools/nip19'
import { Relay } from '@nostr/tools/relay'

import { red, green, yellow } from '@std/fmt/colors'

import { subscribeToIncomingDms, sendDm } from './nostrDm.js'
import { publishRelayListMetadata, subscribeToRelayListMetadata } from './nostrRelayMetadata.js'
import ChatUi from './chatUi.js'
import { ChatModel, ChatMessage } from './chatModel.js'
import { readKey, writeKey } from './localStore.js'

class ChatController {
  #npub: string
  #nsec: Uint8Array
  #model: ChatModel
  #ui: ChatUi
  #connectedInboxRelays : Relay[]
  #connectedGeneralRelays : Relay[]

  constructor() {
    this.#npub = ''
    this.#nsec = new Uint8Array()

    this.#model = new ChatModel()
    this.#ui = new ChatUi(this, this.#model)
    this.#connectedInboxRelays = []
    this.#connectedGeneralRelays = []
  }

  
  async run() {
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
    
    await this.#model.load()
    
    
    console.log(`Connecting to inbox relays`)
    this.#connectedInboxRelays = await this.#connectToRelays(this.#model.settings.inboxRelays)
    console.log(`Connecting to discovery relays`)
    this.#connectedGeneralRelays = await this.#connectToRelays(this.#model.settings.generalRelays)
    
    
    // subscribe to receive DMs from inbox relays
    for (let i = 0; i < this.#connectedInboxRelays.length; i++) {
      console.log(`Subscribing to incoming DMs from relay: ${this.#connectedInboxRelays[i].url}`)
      await subscribeToIncomingDms(this.#npub, this.#nsec, this.#connectedInboxRelays[i], 
        (msg: ChatMessage) => this.#onIncoming(msg))
      
    }
    
    // subscribe to receive relaylist metadata for all of our contacts from general relays
    for (let i = 0; i < this.#connectedGeneralRelays.length; i++) {
      console.log(`Subscribing to relay metadata from relay: ${this.#connectedGeneralRelays[i].url}`)
      //TODO add all contact npubs
      await subscribeToRelayListMetadata([this.#npub], this.#connectedGeneralRelays[i], 
        (ev: any) => this.#onRelaylistMetadata(ev))
    }
    
    // wait
    const sleep = (ms: number) => {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    }
    await sleep(100)

    // publish our inbox relays (i.e. so other people know how to send message to us)
    for (let i = 0; i < this.#connectedGeneralRelays.length; i++) {
      const relay = this.#connectedGeneralRelays[i]
      console.log(`Publishing our inbox relaylist to relay: ${relay.url}`)
      const inboxRelayList = this.#model.settings.inboxRelays
      await publishRelayListMetadata(this.#npub, this.#nsec, relay, inboxRelayList)
    }

    const connError = this.#connectedInboxRelays.length === 0 || this.#connectedGeneralRelays.length === 0
    if (connError) {
      await this.#ui.go('offline')
    } else {
      await this.#ui.go()
    }
    
    this.#connectedInboxRelays.forEach(relay => relay.close())
  }

  async sendDm(recipientNpub: string, text: string) {
    const recipientPubKey = decode(recipientNpub).data as string
    // TODO connect to and use recipient's inbox relays (not our inbox relay!)
    const sentMsg = await sendDm(this.#npub, this.#nsec, recipientPubKey, this.#connectedInboxRelays[0], text)
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

  async #connectToRelays(relayUrls: string[]) : Promise<Relay[]> {
    let connectedRelays = []
    for (let relayUrl of relayUrls) {
      try {
        const relay = await Relay.connect(relayUrl)
        connectedRelays.push(relay)
        console.log(`connected to ${relay.url}`)
      
      } catch (err) {
        console.log(`Failed to connect to relay ${relayUrl}. Error: ${err}`)
      }
    }
    return connectedRelays
  }
    
  
  #onIncoming(msg: ChatMessage) {
    if (!this.#model.getMessage(msg.id)) {
      this.#model.setMessage(msg.id, msg) //todo async?
      this.#ui.newMessage(msg)
    }
  }

  #onRelaylistMetadata(ev: any) {
    console.log(`received relaylist for: ${ev.pubkey} relays: ${ev.tags.map((t:string) => t[1])}`, JSON.stringify(ev))
    // TODO: 
    // update contact(s) with their inbox relays
    // use these when sending to contact
    // if dupes use latest
  }

}

export default ChatController