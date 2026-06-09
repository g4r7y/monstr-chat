import React from 'react';
import { Form } from 'react-bootstrap';
import { useChatController } from '../chatControllerContext';
import type { ChatSettings } from '@core/chatModel';

function NotificationSettings() {
  const controller = useChatController();
  const [settings, setSettings] = React.useState<ChatSettings>(controller.getSettings());

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      await Notification.requestPermission();
    }

    const updatedSettings = {
      ...settings,
      notificationsEnabled: enabled
    };

    await controller.setSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  return (
    <div>
      {!('Notification' in window) && (
        <div className="text-muted d-block mt-2">Notifications are not supported by your browser.</div>
      )}
      {'Notification' in window && Notification.permission === 'denied' && (
        <div className="text-muted d-block mt-2">
          Browser notifications are blocked for Monstr Chat. Update your browser settings to allow them for this site.
        </div>
      )}
      {'Notification' in window && Notification.permission !== 'denied' && (
        <Form.Check
          type="checkbox"
          label="Enable new message notifications"
          checked={(Notification?.permission === 'granted' && settings.notificationsEnabled) || false}
          onChange={e => {
            void handleToggleNotifications(e.target.checked);
          }}
        />
      )}
    </div>
  );
}

export default NotificationSettings;
