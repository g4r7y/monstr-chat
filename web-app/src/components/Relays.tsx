import React from 'react';
import type { ChatSettings } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { Button, ListGroup, ListGroupItem } from 'react-bootstrap';
import type { SettingsListener } from '@core/settingsListener';
import { useAppView } from '../appViewContext';

function Relays() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);
  const { switchView } = useAppView();

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
      <div className="row mb-3">
        <b>Message relays:</b>
      </div>
      <ListGroup className="mb-3">
        {settings.inboxRelays.map((relay, i) => (
          <ListGroupItem key={i} className="list-group-item-secondary text-break">
            {relay}
          </ListGroupItem>
        ))}
      </ListGroup>
      <Button onClick={() => switchView('edit-message-relays')}>Edit</Button>
      <div className="row mb-3 mt-4">
        <b>General relays:</b>
      </div>
      <ListGroup className="mb-3">
        {settings.generalRelays.map((relay, i) => (
          <ListGroupItem key={i} className="list-group-item-secondary text-break">
            {relay}
          </ListGroupItem>
        ))}
      </ListGroup>
      <Button onClick={() => switchView('edit-general-relays')}>Edit</Button>
    </div>
  );
}

export default Relays;
