
import { npubEncode } from "@nostr/tools/nip19"
import { wrapEvent, unwrapEvent } from "@nostr/tools/nip17"
import { Relay } from "@nostr/tools/relay"
import { NostrEvent } from "@nostr/tools"
import { ChatMessage } from "./chatModel.js"


// NIP17 
const sendDm = async (npub: string, nsec: Uint8Array, recipientPubKey: string, relay: Relay, text: string) : Promise<ChatMessage | null> => {
  try {
    const recipient = { publicKey: recipientPubKey } //todo optional relay?
    const event = await wrapEvent(nsec, recipient, text)
    await relay.publish(event)
    // time from the NIP17 wrapped event is deliberately wrong. so use local time instead.
    let createdDate = new Date()
    let sentMessage : ChatMessage = {
      id: event.id,
      time: createdDate,
      text,
      sender: npubEncode(npub), //self
      receiver: npubEncode(recipientPubKey),
      state: 'tx'
    }
    console.log('sent DM', JSON.stringify(sentMessage))
    return sentMessage
  } catch(err) {
    console.log('Failed to send nip17 message', err)
    return null
  }
}

// NIP17
const receiveDm = async (npub: string, nsec: Uint8Array, event: NostrEvent) : Promise<ChatMessage | null> => {
  try {
    const plainEvent = await unwrapEvent(event, nsec)
    let createdDate = new Date(0)
    createdDate.setUTCSeconds(plainEvent.created_at)
    // todo should we use local time for received messages too? in case the event times are out of synch with sent times?
    let msg = {
      sender: npubEncode(plainEvent.pubkey),
      receiver: npubEncode(npub), //self
      text: plainEvent.content,
      time: createdDate,
      id: plainEvent.id,
      state: 'rx'
    }
    console.log('received DM', JSON.stringify(msg))
    return msg
  } catch(err) {
    console.log('Failed to decrypt nip17 message', err)
    return null
  }
}

const subscribeToIncomingDms = async (npub: string, nsec: Uint8Array, relay: Relay, onMessage: (msg: ChatMessage)=>void) => {
  relay.subscribe([
    {
      kinds: [1059, 10002], //nip17 giftwrapped; nip65 relay
      '#p': [npub],
    },
  ], {
    async onevent (event) {
      if (event.kind === 10002) {
        console.log('Received nip65 relay message', event)
      }
      if (event.kind === 4) {
        console.log('Received nip4 message. Ignoring as not supported')
      }
      if (event.kind === 1059) { // possible giftwrapped NIP17 DM
        const msg = await receiveDm(npub, nsec, event)
        if (msg) {
          onMessage(msg)
        }
      }
    }
  })
}

const subscribeToRelayListMetadata = async (npubList: string[], relay: Relay, onMessage: (relayMessage: any)=>void ) => {
  relay.subscribe([
    {
      kinds: [10002],
      '#p': npubList,
    },
  ], {
    async onevent (event) {
      if (event.kind === 10002) {
        console.log('Received nip65 relay message', event)
      }
    }
  })
}

// const publishEvent = async (relay, nsec) => {
//   const createdTimestamp = Date.now()

//   let eventTemplate = {
//     kind: 1,
//     created_at: Math.floor(createdTimestamp / 1000),
//     tags: [],
//     content: 'hello nostr world',
//   }

//   // this assigns the pubkey, calculates the event id and signs the event in a single step
//   const signedEvent = finalizeEvent(eventTemplate, nsec)
//   await relay.publish(signedEvent)
//   console.log('published event')
// }


export { sendDm, subscribeToIncomingDms, subscribeToRelayListMetadata }
