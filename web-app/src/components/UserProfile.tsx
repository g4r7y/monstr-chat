import React from 'react';
import { Button, Card, Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap';
import type { ChatSettings } from '@core/chatModel';
import type { SettingsListener } from '@core/settingsListener';
import { useChatController } from '../chatControllerContext';
import Nip05Address from './Nip05Address';
import { useAppView } from '../appViewContext';

function UserProfile() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);

  const [settings, setSettings] = React.useState<ChatSettings>(controller.getSettings());

  const { switchView } = useAppView();

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

  const editProfile = () => {
    switchView('edit-profile');
  };

  return (
    <div>
      {settings.profile === null && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              A public profile helps other Nostr users discover you.
              <br />
              Would you like to set one up?
            </Card.Text>
            <Button onClick={editProfile} variant="primary">
              Add profile
            </Button>
          </Card.Body>
        </Card>
      )}

      {settings.profile && (
        <div>
          <ListGroup>
            <ListGroupItem className="list-group-item-secondary text-break">
              <Row>
                <Col xs={4}>Your nickname:</Col>
                <Col xs={8}>{settings.profile?.name ?? ''}</Col>
              </Row>
            </ListGroupItem>
            <ListGroupItem className="list-group-item-secondary text-break">
              <Row>
                <Col xs={4}>About:</Col>
                <Col xs={8}>{settings?.profile?.about ?? ''}</Col>
              </Row>
            </ListGroupItem>
            <ListGroupItem className="list-group-item-secondary text-break">
              <Row>
                <Col xs={4}>NIP-05 address:</Col>
                <Col xs={8}>
                  <Nip05Address npub={controller.getNpub()} nip05={settings.profile?.nip05 ?? ''} />
                </Col>
              </Row>
            </ListGroupItem>
          </ListGroup>
          <Button className="mt-3" onClick={editProfile} variant="primary">
            Edit profile
          </Button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
