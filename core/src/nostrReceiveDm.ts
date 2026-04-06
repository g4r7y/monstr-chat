import { npubEncode } from '@nostr/tools/nip19';
import { unwrapEvent } from '@nostr/tools/nip17';
import { SimplePool, type SubCloser, type SubscribeManyParams } from '@nostr/tools/pool';
import type { Filter, NostrEvent, UnsignedEvent } from '@nostr/tools';
import type { ChatMessage } from './chatModel.js';
import { normalizeURL } from '@nostr/tools/utils';

let subCloser: SubCloser;

// NIP17
const onReceiveDm = async (pubkey: string, privateKey: Uint8Array, event: NostrEvent): Promise<ChatMessage | null> => {
  try {
    type PlainEventWithId = UnsignedEvent & {
      id: string;
    };
    const plainEvent: PlainEventWithId = await unwrapEvent(event, privateKey);
    const createdDate = new Date(0);
    createdDate.setUTCSeconds(plainEvent.created_at);

    // get recipient pubkeys from p tags
    const allRecipients = plainEvent.tags.filter(tag => tag.length > 1 && tag[0] == 'p').map(ptag => ptag[1]);
    const recipientsExcludingSelf = allRecipients.filter(recPubKey => recPubKey !== pubkey);

    let state: 'tx' | 'rx';
    let recipients;
    if (plainEvent.pubkey === pubkey && recipientsExcludingSelf.length === 0) {
      // it's an outgoing message to ourself
      state = 'rx'; //TODO have a separate state for tx/rx self?
      recipients = [npubEncode(pubkey)];
    } else if (plainEvent.pubkey === pubkey) {
      // it's a normal outgoing message to single or group
      state = 'tx';
      recipients = recipientsExcludingSelf.map(npubEncode);
    } else {
      // it's an incoming message
      state = 'rx';
      recipients = recipientsExcludingSelf.map(npubEncode);
    }

    return {
      sender: npubEncode(plainEvent.pubkey),
      text: plainEvent.content,
      time: createdDate,
      id: plainEvent.id,
      state,
      recipients
    };
  } catch (err) {
    console.log('Failed to decrypt nip17 message', err);
    return null;
  }
};

const receiveDms = async (
  pubkey: string,
  privateKey: Uint8Array,
  pool: SimplePool,
  relays: { url: string; lastSeenTimestamp?: number }[],
  onMessage: (msg: ChatMessage, relaysSeenOn: string[]) => Promise<void>
) => {
  if (subCloser) {
    subCloser.close();
  }

  const baseFilter: Filter = {
    kinds: [1059], //nip17 giftwrapped
    '#p': [pubkey]
  };
  const params: SubscribeManyParams = {
    id: 'incoming-dm-sub-id', // always use fixed sub id
    async onevent(event: NostrEvent) {
      if (event.kind === 1059) {
        // possible giftwrapped NIP17 DM
        const msg = await onReceiveDm(pubkey, privateKey, event);
        if (msg) {
          const set = pool.seenOn.get(event.id);
          const seenOnRelays = set ? Array.from(set).map(r => r.url) : [];
          await onMessage(msg, seenOnRelays);
        }
      }
    }
  };

  // create subscription request for each relay, ensuring no duplicate relay urls
  const requests: { url: string; filter: Filter }[] = [];
  for (const relay of relays) {
    const url = normalizeURL(relay.url);
    if (!requests.find(r => r.url === url)) {
      const filter = { ...baseFilter };
      // try to filter old messages that we have already received
      if (relay.lastSeenTimestamp) {
        // time of newly-received wrapped messages may actually appear to the relay to
        // be up to 2 days old due to nip-59 timestamp masking
        const twoDays = 48 * 60 * 60;
        const currentMsgTime = Math.floor(new Date().valueOf() / 1000) - twoDays;
        // set the 'since' time to whichever is the oldest
        filter.since = Math.min(relay.lastSeenTimestamp, currentMsgTime);
      }
      console.log(`receiving dms from ${url} since ${filter.since}`);
      requests.push({ url, filter: filter });
    }
  }

  subCloser = pool.subscribeMap(requests, params);
};

export { receiveDms };
