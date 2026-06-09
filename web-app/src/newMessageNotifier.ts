import type { MessageListener } from '@core/messageListener';
import type { ChatMessage } from '@core/chatModel';
import type { ChatController } from '@core/chatController';
import { contactLabel } from './utils/contactLabel';

export class NewMessageNotifier implements MessageListener {
  #controller: ChatController;

  constructor(controller: ChatController) {
    this.#controller = controller;
  }

  notifyMessage(msg: ChatMessage): void {
    // Only show notification for incoming messages
    if (msg.state !== 'rx') {
      return;
    }

    // Check if notifications are enabled
    if (!this.#controller.getSettings().notificationsEnabled) {
      return;
    }

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Check if permission was granted
    if (Notification.permission !== 'granted') {
      return;
    }

    // Get sender display name
    const senderName = contactLabel(msg.sender, this.#controller);

    // Show notification
    new Notification(`Monstr Chat: new message from ${senderName}`, {
      tag: `msg-${msg.id}` // Prevent duplicate notifications
    });
  }
}
