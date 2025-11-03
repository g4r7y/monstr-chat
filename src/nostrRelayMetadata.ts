import { Relay } from "@nostr/tools/relay"
import { Event, finalizeEvent, SimplePool } from "@nostr/tools"
import { SubCloser } from "@nostr/tools/abstract-pool"

let subCloser : SubCloser

const publishRelayListMetadata = async (npub: string, nsec: Uint8Array, pool: SimplePool, relays: string[], inboxRelayList: string[]) => {

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

  try {
    // this assigns the pubkey, calculates the event id and signs the event in a single step
    const signedEvent = finalizeEvent(eventTemplate, nsec)
    await Promise.any(pool.publish(relays, signedEvent))
  } catch (err) {
    console.log('Failed to send nip65 relay list metadata', err)
    throw new Error('Failed to send nip65')
  }
}

const subscribeToRelayListMetadata = async (npubList: string[], pool: SimplePool, relays: string[], onEvent: (event: Event)=>void ) => {
  if (subCloser) {
    subCloser.close()
  }
  try {
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
  } catch (err) {
    console.log('Failed to subscribe to nip65 relay list metadata', err)
    throw new Error('Failed to subscribe to nip65')
  }
}


export { publishRelayListMetadata, subscribeToRelayListMetadata }