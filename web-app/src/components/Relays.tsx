import React from 'react';
import type { ChatSettings } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import type { SettingsListener } from '@core/settingsListener';

function Relays() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);

  const [settings, setSettings] = React.useState<ChatSettings>(controller.getSettings());

  React.useEffect(() => {
    const listener = new (class implements SettingsListener {
      notifySettingsChanged(): void {
        setSettings(controllerRef.current.getSettings());
      }
    })();

    const curController = controllerRef.current;
    curController.addSettingsListener(listener);

    return () => {
      curController.removeSettingsListener(listener);
    };
  }, []);

  return (
    <div>
      <div className="row mb-2">Inbox relays:</div>
      <ListGroup className="mb-3">
        {settings.inboxRelays.map((relay, i) => (
          <ListGroupItem key={i} className="list-group-item-secondary text-break">
            {relay}
          </ListGroupItem>
        ))}
      </ListGroup>
      <div className="row mb-2">General relays:</div>
      <ListGroup className="mb-3">
        {settings.generalRelays.map((relay, i) => (
          <ListGroupItem key={i} className="list-group-item-secondary text-break">
            {relay}
          </ListGroupItem>
        ))}
      </ListGroup>
    </div>
  );
}

export default Relays;
