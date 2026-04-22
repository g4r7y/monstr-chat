import type { ChatController } from '@core/chatController';

export const contactLabel = (npub: string, controller: ChatController): string => {
  const contact = controller.getContactByNpub(npub);
  return contact ? contact.name : `${npub.slice(0, 9)}..${npub.slice(-5)}`;
};
