import React from 'react';
import { Button, Col, Form, ListGroup, ListGroupItem, Modal, ModalHeader, Navbar, Row } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import type { ChatContact } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import Nip05Address from './Nip05Address';

function ViewFriend() {
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);

  const { switchView, currentContactNpub } = useAppView();
  // memoise current contact (only changes when view changes)
  const currentContactNpubRef = React.useRef(currentContactNpub);

  const handleBack = () => {
    switchView('friends');
  };

  const [contact, setContact] = React.useState<ChatContact | null>(null);
  const [friendName, setFriendName] = React.useState('');
  const [inputError, setInputError] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  React.useEffect(() => {
    const c = controllerRef.current.getContactByNpub(currentContactNpubRef.current);
    if (c) {
      setContact(c);
      setFriendName(c.name);
    }
  }, []);

  const handleSave = async () => {
    if (friendName.length === 0) {
      setInputError('Name cannot be empty');
    } else if (friendName !== contact?.name && controller.getContactByName(friendName) !== null) {
      setInputError('You already have a friend with the same name');
    } else {
      if (contact) {
        const updatedContact = {
          ...contact,
          name: friendName
        };
        await controller.setContact(updatedContact);
        setContact(updatedContact);
      }
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await controller.deleteContact(currentContactNpub);
    handleBack();
  };

  return (
    <Container>
      <Navbar bg="light">
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>{contact ? contact.name : 'Unknown contact'}</Navbar.Brand>
        </div>
      </Navbar>

      <ListGroup className="mt-3 mb-3">
        <ListGroupItem className="list-group-item-secondary text-break">
          <Row>
            <Col xs={4}>Npub:</Col>
            <Col xs={8}>{currentContactNpub}</Col>
          </Row>
        </ListGroupItem>

        {contact?.profile?.nip05 && (
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>NIP-05 address:</Col>
              <Col xs={8} className="truncate">
                <Nip05Address npub={currentContactNpub} nip05={contact.profile.nip05} />
              </Col>
            </Row>
          </ListGroupItem>
        )}

        {contact?.profile?.name && (
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>Nickname:</Col>
              <Col xs={8} className="truncate">
                {contact.profile.name}
              </Col>
            </Row>
          </ListGroupItem>
        )}

        {contact?.profile?.about && (
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>About:</Col>
              <Col xs={8}>{contact.profile.about}</Col>
            </Row>
          </ListGroupItem>
        )}

        {contact?.relays && contact.relays.length > 0 && (
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>Inbox relays:</Col>
              <Col xs={8} className="truncate">
                {contact.relays.map((r, i) => (
                  <div key={i}>
                    {r}
                    <br />
                  </div>
                ))}
              </Col>
            </Row>
          </ListGroupItem>
        )}
      </ListGroup>

      {isEditing && (
        <Form>
          <div className="mb-3">
            <Form.Label>Name:</Form.Label>
            <Form.Control
              type="text"
              value={friendName}
              onChange={event => {
                setFriendName(event.target.value);
                setInputError('');
              }}
              isInvalid={!!inputError}
            />
            <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
          </div>
        </Form>
      )}

      {isEditing ? (
        <>
          <Button className="mt-3 me-3" variant="primary" onClick={handleSave}>
            Save
          </Button>
          <Button className="mt-3 me-3" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button className="mt-3 me-3" variant="primary" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <Button className="mt-3" variant="warning" onClick={() => setShowDeleteConfirmation(true)}>
            Delete
          </Button>
        </>
      )}

      <Modal show={showDeleteConfirmation} onHide={() => setShowDeleteConfirmation(false)}>
        <ModalHeader>
          <Modal.Title>Delete friend</Modal.Title>
        </ModalHeader>
        <Modal.Body>
          Are you sure you want to delete <b>{friendName}</b> from your friends?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirmation(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default ViewFriend;
