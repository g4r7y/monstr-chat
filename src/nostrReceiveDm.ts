
import { npubEncode } from "@nostr/tools/nip19"
import { unwrapEvent } from "@nostr/tools/nip17"
import { NostrEvent } from "@nostr/tools"
import { SimplePool, SubCloser } from "@nostr/tools/pool"
import { ChatMessage } from "./chatModel.js"

let subCloser: SubCloser

// NIP17
const onReceiveDm = async (npub: string, nsec: Uint8Array, event: NostrEvent) : Promise<ChatMessage | null> => {
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

const receiveDms = async (npub: string, nsec: Uint8Array, pool: SimplePool, relays: string[], onMessage: (msg: ChatMessage)=>void) => {
  if (subCloser) {
    subCloser.close()
  }

  subCloser = pool.subscribe(
    relays,
    {
      kinds: [1059], //nip17 giftwrapped
      '#p': [npub],
    }, 
    {
      id: 'incoming-dm-sub-id', // always use fixed sub id
      async onevent (event) {
        if (event.kind === 1059) { // possible giftwrapped NIP17 DM
          const msg = await onReceiveDm(npub, nsec, event)
          if (msg) {
            onMessage(msg)
          }
        }
      }
    })
}


export { receiveDms }
