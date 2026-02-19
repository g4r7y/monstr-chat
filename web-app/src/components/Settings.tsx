import { Accordion, ListGroup, ListGroupItem } from 'react-bootstrap';
import { useChatController } from '../chatControllerContext';
import UserProfile from './UserProfile';
import Relays from './Relays';

function Settings() {
  const controller = useChatController();
  return (
    <Accordion>
      <Accordion.Item eventKey="0">
        <Accordion.Header>Profile</Accordion.Header>
        <Accordion.Body>
          <UserProfile />
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>Relays</Accordion.Header>
        <Accordion.Body>
          <Relays />
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Keys</Accordion.Header>
        <Accordion.Body>
          <div>
            <div className="row mb-2">Your public key (npub):</div>
            <ListGroup className="mb-3">
              <ListGroupItem className="list-group-item-secondary text-break">{controller.getNpub()}</ListGroupItem>
            </ListGroup>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default Settings;
