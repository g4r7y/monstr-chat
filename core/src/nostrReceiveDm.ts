import { npubEncode } from '@nostr/tools/nip19';
import { unwrapEvent } from '@nostr/tools/nip17';
import { SimplePool, type SubCloser } from '@nostr/tools/pool';
import type { NostrEvent, UnsignedEvent } from '@nostr/tools';
import type { ChatMessage } from './chatModel.js';

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

    const pTags = plainEvent.tags.filter(tag => tag.length > 1 && tag[0] == 'p');
    const hasOtherRecipients = pTags.filter(pTag => pTag[1] !== pubkey).length > 0;

    let msg = null;
    if (plainEvent.pubkey === pubkey && hasOtherRecipients) {
      // from self and not just to ourself
      // it's an outgoing message
      const firstReceiver = pTags.find(ptag => ptag[1] !== pubkey)![1];
      msg = {
        sender: npubEncode(pubkey),
        text: plainEvent.content,
        time: createdDate,
        id: plainEvent.id,
        state: 'tx',
        receiver: npubEncode(firstReceiver)
      };
    } else {
      // it's an incoming message or a message to self
      msg = {
        sender: npubEncode(plainEvent.pubkey),
        text: plainEvent.content,
        time: createdDate,
        id: plainEvent.id,
        state: 'rx',
        receiver: npubEncode(pubkey)
      };
    }
    // console.log('received DM', JSON.stringify(msg))
    return msg;
  } catch (err) {
    console.log('Failed to decrypt nip17 message', err);
    return null;
  }
};

const receiveDms = async (
  pubkey: string,
  privateKey: Uint8Array,
  pool: SimplePool,
  relays: string[],
  onMessage: (msg: ChatMessage) => Promise<void>
) => {
  if (subCloser) {
    subCloser.close();
  }

  subCloser = pool.subscribe(
    relays,
    {
      kinds: [1059], //nip17 giftwrapped
      '#p': [pubkey]
    },
    {
      id: 'incoming-dm-sub-id', // always use fixed sub id
      async onevent(event) {
        if (event.kind === 1059) {
          // possible giftwrapped NIP17 DM
          const msg = await onReceiveDm(pubkey, privateKey, event);
          if (msg) {
            await onMessage(msg);
          }
        }
      }
    }
  );
};

export { receiveDms };
