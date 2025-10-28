import { Relay, Subscription } from "@nostr/tools/relay"
import { finalizeEvent } from "@nostr/tools"

let subscription : Subscription


const publishRelayListMetadata = async (npub: string, nsec: Uint8Array, relay: Relay, inboxRelayList: string[]) => {

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

  // this assigns the pubkey, calculates the event id and signs the event in a single step
  const signedEvent = finalizeEvent(eventTemplate, nsec)
  await relay.publish(signedEvent)
}


const subscribeToRelayListMetadata = async (npubList: string[], relay: Relay, onEvent: (event: any)=>void ) => {
  if (subscription) {
    subscription.close()
  }

  subscription = relay.subscribe([
    {
      kinds: [10002],
      authors: npubList,
    },
  ], {
    id: 'relaylist-metadata-sub-id',  // always use fixed sub id
    async onevent (event) {
      if (event.kind === 10002) {
        onEvent(event)
      }
    }
  })
}


export { publishRelayListMetadata, subscribeToRelayListMetadata }