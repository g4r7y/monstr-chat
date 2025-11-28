import { npubEncode } from "@nostr/tools/nip19"
import { wrapEvent } from "@nostr/tools/nip17"
import { SimplePool } from "@nostr/tools/pool"
import { ChatMessage } from "./chatModel.js"


// NIP17 
const sendDm = async (npub: string, nsec: Uint8Array, recipientPubKey: string, pool: SimplePool, relays: string[], text: string) : Promise<ChatMessage> => {
  try {
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
    throw new Error('Failed to send nip17 message')
  }
}

export { sendDm }