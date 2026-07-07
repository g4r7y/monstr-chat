import React from 'react';
import { Button, Card, Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap';
import type { ChatSettings } from '@core/chatModel';
import type { SettingsListener } from '@core/settingsListener';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';

function UserProfile() {
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

  const editProfile = () => {
    pushView('edit-profile');
  };

  const hasProfile = () => settings.profile?.name || settings.profile?.about || settings.profile?.website;

  return (
    <div>
      {!hasProfile() && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              A public profile helps other Nostr users find out about you.
              <br />
              Would you like to enter your profile information?
            </Card.Text>
            <Button onClick={editProfile} variant="primary">
              Add profile
            </Button>
          </Card.Body>
        </Card>
      )}

      {hasProfile() && (
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
                <Col xs={4}>Website:</Col>
                <Col xs={8}>{settings?.profile?.website ?? ''}</Col>
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
