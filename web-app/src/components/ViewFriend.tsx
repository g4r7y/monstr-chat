import React from 'react';
import { Button, Col, Form, ListGroup, ListGroupItem, Navbar, Row } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import type { ChatContact } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';



function ViewFriend() {

  const chatController = useChatController();

  const { switchView, currentContactNpub } = useAppView();

  const handleBack = () => {
    switchView('friends');
  }

  const [contact, setContact] = React.useState<ChatContact | null>(null);
  const [nickName, setNickName] = React.useState('');
  const [inputError, setInputError] = React.useState('');

  React.useEffect(() => {
    const c = chatController.getContactByNpub(currentContactNpub);
    if (c) {
      setContact(c);
      setNickName(c.name);
    }
  }, []);

  const handleSave = async () => {
    if (nickName.length === 0) {
      setInputError('Name cannot be empty');
    } else if (nickName !== contact?.name && chatController.getContactByName(nickName) !== null) {
      setInputError('You already have a friend with the same name');
    }
    else {
      if (contact) {
        const updatedContact = {
          ...contact,
          name: nickName,
        };
        await chatController.setContact(updatedContact);
      }
      handleBack();
    }
  }

  return (
    <Container>
      <Navbar bg="light" >
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>{contact ? contact.name : "Unknown contact"}</Navbar.Brand>
        </div>
      </Navbar>

      <ListGroup className="mt-3 mb-3">

        <ListGroupItem className="list-group-item-secondary text-break">
          <Row>
            <Col xs={4}>Npub:</Col>
            <Col xs={8}>{currentContactNpub}</Col>
          </Row>
        </ListGroupItem>

        {contact?.nip05 &&
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>NIP-05 address:</Col>
              <Col xs={8} className="truncate">{contact.nip05}</Col>
            </Row>
          </ListGroupItem>
        }

        {contact?.profileName &&
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>Nickname:</Col>
              <Col xs={8} className="truncate">{contact.profileName}</Col>
            </Row>
          </ListGroupItem>
        }


        {contact?.profileAbout &&
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>About:</Col>
              <Col xs={8}>{contact.profileAbout}</Col>
            </Row>
          </ListGroupItem>
        }

        {contact?.relays && contact.relays.length > 0 &&
          <ListGroupItem className="list-group-item-secondary text-break">
            <Row>
              <Col xs={4}>Inbox relays:</Col>
              <Col xs={8} className="truncate">{contact.relays.map(r => <div>{r}<br/></div>)}</Col>
            </Row>
          </ListGroupItem>
        }
      </ListGroup>

      <Form>
        <div className="mb-3">
          <Form.Label>Name:</Form.Label>
          <Form.Control
            type="text"
            value={nickName}
            onChange={(event) => { setNickName(event.target.value); setInputError('') }}
            isInvalid={!!inputError}
          />
          <Form.Control.Feedback type="invalid">
            {inputError}
          </Form.Control.Feedback>
        </div>
        <Button className="mb-3" variant="primary" onClick={handleSave}>Update</Button>

      </Form>
    </Container>

  )
}

export default ViewFriend

