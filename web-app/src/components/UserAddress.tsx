import React from 'react';
import { Button, Card, ListGroup, ListGroupItem } from 'react-bootstrap';
import type { ChatSettings } from '@core/chatModel';
import type { SettingsListener } from '@core/settingsListener';
import { useChatController } from '../chatControllerContext';
import Nip05Address from './Nip05Address';
import { useAppView } from '../appViewContext';

function UserAddress() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);

  const [settings, setSettings] = React.useState<ChatSettings>(controller.getSettings());

  const { pushView } = useAppView();

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

  const editAddress = () => {
    pushView('edit-address');
  };

  return (
    <div>
      {!settings.profile?.nip05 && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              A Nostr address makes it easy for other users to connect with you.
              <br />
              Would you like to set one up?
              <br />
            </Card.Text>
            <Button onClick={editAddress} variant="primary">
              Add Nostr address
            </Button>
          </Card.Body>
        </Card>
      )}

      {settings.profile?.nip05 && (
        <div>
          <div className="mb-3">Your NIP-05 address:</div>
          <ListGroup>
            <ListGroupItem className="list-group-item-secondary text-break">
              <Nip05Address npub={controller.getNpub()} nip05={settings.profile?.nip05 ?? ''} />
            </ListGroupItem>
          </ListGroup>
          <Button className="mt-3" onClick={editAddress} variant="primary">
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}

export default UserAddress;
