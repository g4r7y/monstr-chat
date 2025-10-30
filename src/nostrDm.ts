
import { npubEncode } from "@nostr/tools/nip19"
import { wrapEvent, unwrapEvent } from "@nostr/tools/nip17"
import { Relay, Subscription } from "@nostr/tools/relay"
import { NostrEvent } from "@nostr/tools"
import { SimplePool } from "@nostr/tools/pool"
import { ChatMessage } from "./chatModel.js"


let subscription: Subscription


// NIP17 
const sendDm = async (npub: string, nsec: Uint8Array, recipientPubKey: string, relays: string[], text: string) : Promise<ChatMessage | null> => {
  try {
    let pool = new SimplePool()
    const recipient = { publicKey: recipientPubKey }
    const event = await wrapEvent(nsec, recipient, text)
    await Promise.any(pool.publish(relays, event))

    // Return a local copy of the sent message
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
    // TODO should we use local time for received messages too? in case the event times are out of synch with sent times?
    let msg = {
      sender: npubEncode(plainEvent.pubkey),
      receiver: npubEncode(npub), //self
      text: plainEvent.content,
      time: createdDate,
      id: plainEvent.id,
      state: 'rx'
    }
    // console.log('received DM', JSON.stringify(msg))
    return msg
  } catch(err) {
    console.log('Failed to decrypt nip17 message', err)
    return null
  }
}

// TODO change to take list of relays and use pool instead of using relay directly
const subscribeToIncomingDms = async (npub: string, nsec: Uint8Array, relay: Relay, onMessage: (msg: ChatMessage)=>void) => {
  if (subscription) {
    subscription.close()
  }

  subscription = relay.subscribe([
    {
      kinds: [1059], //nip17 giftwrapped
      '#p': [npub],
    },
  ], {
    id: 'incoming-dm-sub-id', // always use fixed sub id
    async onevent (event) {
      if (event.kind === 1059) { // possible giftwrapped NIP17 DM
        const msg = await receiveDm(npub, nsec, event)
        if (msg) {
          onMessage(msg)
        }
      }
    }
  })
}


export { sendDm, subscribeToIncomingDms }
