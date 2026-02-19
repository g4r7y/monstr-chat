import { SimplePool } from '@nostr/tools/pool';
import type { EventTemplate, NostrEvent } from '@nostr/tools/core';
import * as nip59 from '@nostr/tools/nip59';

type Recipient = {
  publicKey: string;
  relayUrl?: string;
};

type ReplyTo = {
  eventId: string;
  relayUrl?: string;
};

function createEvent(
  recipients: Recipient | Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo
): EventTemplate {
  const baseEvent: EventTemplate = {
    created_at: Math.ceil(Date.now() / 1000),
    kind: 14,
    tags: [],
    content: message
  };

  const recipientsArray = Array.isArray(recipients) ? recipients : [recipients];

  recipientsArray.forEach(({ publicKey, relayUrl }) => {
    baseEvent.tags.push(relayUrl ? ['p', publicKey, relayUrl] : ['p', publicKey]);
  });

  if (replyTo) {
    baseEvent.tags.push(['e', replyTo.eventId, replyTo.relayUrl || '', 'reply']);
  }

  if (conversationTitle) {
    baseEvent.tags.push(['subject', conversationTitle]);
  }

  return baseEvent;
}

// Forked from nostr-tools/nip17, which doesn't handle recipient groups, as it only
// includes single recipient when creating the plain event. We want to add a p tag for every recipient in the group.

function wrapMultiRecipientEvent(
  senderPrivateKey: Uint8Array,
  receiverPublicKey: string,
  recipientGroup: Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo
): NostrEvent {
  if (!recipientGroup || recipientGroup.length === 0) {
    throw new Error('At least one recipient is required.');
  }

  // create event with p tag for each recipient in the group
  const event = createEvent(recipientGroup, message, conversationTitle, replyTo);
  // wrap the event so it can be received by the specified recipient
  return nip59.wrapEvent(event, senderPrivateKey, receiverPublicKey);
}

export type SendDmRecipient = {
  pubKey: string;
  relays: string[];
};

// NIP17 group send
const sendDm = async (senderPrivateKey: Uint8Array, recipients: SendDmRecipient[], pool: SimplePool, text: string) => {
  try {
    const recipientGroup: Recipient[] = recipients.map(r => ({
      publicKey: r.pubKey
    }));

    for (const recipient of recipients) {
      const event = wrapMultiRecipientEvent(senderPrivateKey, recipient.pubKey, recipientGroup, text);
      try {
        await Promise.any(pool.publish(recipient.relays, event));
      } catch (err) {
        console.log(`Failed to send nip17 to ${recipient.pubKey}`);
        throw err;
      }
    }
  } catch (err) {
    console.log('Failed to send nip17 message', err);
    throw new Error('Failed to send nip17 message');
  }
};

export { sendDm };
