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

const subscribeToRelayListMetadata = async (npubList: string[], pool: SimplePool, relays: string[], callback: (event: Event)=>Promise<void> ) => {
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
            await callback(event)
          }
        }
      })
  } catch (err) {
    console.log('Failed to subscribe to nip65 relay list metadata', err)
    throw new Error('Failed to subscribe to nip65')
  }
}

const getRelayListMetadata = async (npub: string, pool: SimplePool, relays: string[]) : Promise<Event | undefined> => {
  try {
    const events = await pool.querySync(
      relays, 
      {
        kinds: [10002],
        authors: [npub],
      },
    )
    if (events) {
      // TODO may be different events from different relays so take the latest
      return events[0]
    }
    return undefined

  } catch (err) {
    console.log('Failed to get nip65 relay list metadata for npub', err)
    throw new Error('Failed to get nip65')
  }
}

const extractReadRelaysFromNip65 = (ev: Event) : string[] => {
  const relays: string[] = ev.tags
    .filter((tag :string[]) => tag[0]==='r')
    .filter((tag :string[]) => tag.length==2 || tag[2]==='read')
    .map((tag: string[]) => tag[1])
  return relays
}

export { publishRelayListMetadata, subscribeToRelayListMetadata, getRelayListMetadata, extractReadRelaysFromNip65 }