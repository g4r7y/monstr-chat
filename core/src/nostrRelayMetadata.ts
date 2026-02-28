import { type Event, finalizeEvent, SimplePool } from '@nostr/tools';
import type { SubCloser } from '@nostr/tools/abstract-pool';

let subCloser: SubCloser;

const publishRelayListMetadata = async (
  pubkey: string,
  nsec: Uint8Array,
  pool: SimplePool,
  relays: string[],
  inboxRelayList: string[]
) => {
  // Define all the relays we expect to READ messages from, i.e. our DM inbox relays.
  // Other people will need to send DM to these relays to reach us.
  const relayTags = [];
  for (const relayUrl of inboxRelayList) {
    relayTags.push(['relay', relayUrl]);
  }

  const createdTimestamp = Date.now();

  // Create 'DM relay' list event (NIP-17, NIP-51)
  const eventTemplate = {
    kind: 10050,
    created_at: Math.floor(createdTimestamp / 1000),
    tags: relayTags,
    content: '',
    pubkey
  };

  try {
    // this assigns the pubkey, calculates the event id and signs the event in a single step
    const signedEvent = finalizeEvent(eventTemplate, nsec);
    await Promise.any(pool.publish(relays, signedEvent));
  } catch (err) {
    console.log('Failed to send relay list metadata', err);
    throw new Error('Failed to send relay list');
  }
};

const subscribeToRelayListMetadata = async (
  pubkeyList: string[],
  pool: SimplePool,
  relays: string[],
  callback: (event: Event) => Promise<void>
) => {
  if (subCloser) {
    subCloser.close();
  }
  try {
    subCloser = pool.subscribe(
      relays,
      {
        kinds: [10050],
        authors: pubkeyList
      },
      {
        id: 'relaylist-metadata-sub-id', // always use fixed sub id
        async onevent(event) {
          if (event.kind === 10050) {
            await callback(event);
          }
        }
      }
    );
  } catch (err) {
    console.log('Failed to subscribe to relay list metadata', err);
    throw new Error('Failed to subscribe to relay list');
  }
};

const getRelayListMetadata = async (pubkey: string, pool: SimplePool, relays: string[]): Promise<Event | undefined> => {
  try {
    const events = await pool.querySync(relays, {
      kinds: [10050],
      authors: [pubkey]
    });
    if (events.length > 0) {
      // may be events from multiple relays, so take the latest
      const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
      return latest;
    }
    return undefined;
  } catch (err) {
    console.log('Failed to get relay list metadata for npub', err);
    throw new Error('Failed to get relay list');
  }
};

const extractDMRelaysFromEvent = (ev: Event): string[] => {
  const relays: string[] = ev.tags
    .filter((tag: string[]) => tag.length == 2 && tag[0] === 'relay')
    .map((tag: string[]) => tag[1]);
  return relays;
};

export { publishRelayListMetadata, subscribeToRelayListMetadata, getRelayListMetadata, extractDMRelaysFromEvent };
