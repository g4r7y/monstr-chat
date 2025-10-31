import { Relay } from "@nostr/tools/relay"
import { Event, finalizeEvent, SimplePool } from "@nostr/tools"
import { SubCloser } from "@nostr/tools/abstract-pool"

let subCloser : SubCloser

const publishRelayListMetadata = async (npub: string, nsec: Uint8Array, relays: string[], inboxRelayList: string[]) => {

  // Define all the relays we expect to READ messages from, i.e. our inbox relays.
  // Other people will need to send DM to these relays to reach us.
  const relayTags = []
  for (let relayUrl of inboxRelayList) {
    relayTags.push(["r", relayUrl, "read"])
  }

  const createdTimestamp = Date.now()

  // Create NIP-65 event
  const eventTemplate = {
    kind: 10002,
    created_at: Math.floor(createdTimestamp / 1000),
    tags: relayTags,
    content: "",
    pubkey: npub
  };

  let pool = new SimplePool()
  // this assigns the pubkey, calculates the event id and signs the event in a single step
  const signedEvent = finalizeEvent(eventTemplate, nsec)
  await Promise.any(pool.publish(relays, signedEvent))
}

const subscribeToRelayListMetadata = async (npubList: string[], relays: string[], onEvent: (event: Event)=>void ) => {
  if (subCloser) {
    subCloser.close()
  }

  let pool = new SimplePool()

  subCloser = pool.subscribe(
    relays, 
    {
      kinds: [10002],
      authors: npubList,
    },
    {
      id: 'relaylist-metadata-sub-id',  // always use fixed sub id
      async onevent (event: any) {
        if (event.kind === 10002) {
          onEvent(event)
        }
      }
    })
}


export { publishRelayListMetadata, subscribeToRelayListMetadata }