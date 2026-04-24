import React from 'react';
import type { ChatSettings } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { Button, ListGroup, ListGroupItem } from 'react-bootstrap';
import type { SettingsListener } from '@core/settingsListener';
import { useAppView } from '../appViewContext';

type RelayListProps = {
  relays: string[];
  connectedRelays: Set<string>;
};
function RelayList(props: RelayListProps) {
  const { relays, connectedRelays } = props;
  return (
    <ListGroup className="mb-3">
      {relays.map((relay, i) => (
        <ListGroupItem key={i} className="list-group-item-secondary text-break">
          {connectedRelays.has(relay) ? (
            <i className="fa-solid fa-circle-check text-success me-2" aria-label="Connected"></i>
          ) : (
            <i className="fa-solid fa-triangle-exclamation text-danger me-2" aria-label="Disonnected"></i>
          )}
          {relay}
        </ListGroupItem>
      ))}
    </ListGroup>
  );
}

function Relays() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);
  const { pushView } = useAppView();

  const [settings, setSettings] = React.useState<ChatSettings>(controller.getSettings());
  const [connectedRelays, setConnectedRelays] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const checkConnections = () => {
      const relaySet = new Set<string>();
      const connectedRelays = controllerRef.current.checkConnectedRelays([
        ...settings.generalRelays,
        ...settings.inboxRelays
      ]);
      for (const relay of connectedRelays) {
        relaySet.add(relay);
      }
      setConnectedRelays(relaySet);
    };

    checkConnections();
    const timerId = setInterval(checkConnections, 10000);
    const destructor = () => clearInterval(timerId);
    return destructor;
  }, [settings]);

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
      <RelayList relays={settings.inboxRelays} connectedRelays={connectedRelays} />
      <Button onClick={() => pushView('edit-message-relays')}>Edit</Button>
      <div className="row mb-3 mt-4">
        <b>General relays:</b>
      </div>
      <RelayList relays={settings.generalRelays} connectedRelays={connectedRelays} />
      <Button onClick={() => pushView('edit-general-relays')}>Edit</Button>
    </div>
  );
}

export default Relays;
