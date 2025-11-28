import { Event, finalizeEvent, SimplePool } from "@nostr/tools"
import { SubCloser } from "@nostr/tools/abstract-pool"

let subCloser : SubCloser

const publishUserMetadata = async (pubkey: string, nsec: Uint8Array, pool: SimplePool, relays: string[], content: Record<string, string>) => {

  const createdTimestamp = Date.now()

  // Create kind0 event
  const eventTemplate = {
    kind: 0,
    created_at: Math.floor(createdTimestamp / 1000),
    content: JSON.stringify(content),
    tags: [],
    pubkey
  };

  try {
    // this assigns the pubkey, calculates the event id and signs the event in a single step
    const signedEvent = finalizeEvent(eventTemplate, nsec)
    await Promise.any(pool.publish(relays, signedEvent))
  } catch (err) {
    console.log('Failed to send user metadata event', err)
    throw new Error('Failed to send user metadata event')
  }
}

const subscribeToUserMetadata = async (pubkeyList: string[], pool: SimplePool, relays: string[], callback: (event: Event)=>Promise<void> ) => {
  if (subCloser) {
    subCloser.close()
  }
  try {
    subCloser = pool.subscribe(
      relays, 
      {
        kinds: [0],
        authors: pubkeyList,
      },
      {
        id: 'user-metadata-sub-id',  // always use fixed sub id
        async onevent (event: any) {
          if (event.kind === 0) {
            await callback(event)
          }
        }
      })
  } catch (err) {
    console.log('Failed to subscribe to user metadata events', err)
    throw new Error('Failed to subscribe to user metadata events')
  }
}

const getUserMetadata = async (pubkey: string, pool: SimplePool, relays: string[]) : Promise<Event | undefined> => {
  try {
    const events = await pool.querySync(
      relays, 
      {
        kinds: [0],
        authors: [pubkey],
      },
    )
    if (events) {
      // may be events from multiple relays, so take the latest
      const latest = events.sort((a,b)=> b.created_at - a.created_at)[0]
      return latest
    }
    return undefined

  } catch (err) {
    console.log('Failed to get user metadata for npub', err)
    throw new Error('Failed to get user metadata')
  }
}

const extractContentFromUserMetadataEvent = (event: Event) : Record<string, any> | null => {
  try {
    const content = JSON.parse(event.content)
    return content
  } catch (err) {
    // bad json, return null
  }
  return null
}

export { publishUserMetadata, subscribeToUserMetadata, getUserMetadata, extractContentFromUserMetadataEvent }