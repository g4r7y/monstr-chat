import React from 'react';
import { Button, Col, Container, Form, ListGroup, Navbar, Row, Card } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import type { MessageListener } from '@core/messageListener';
import type { ChatContact, ChatMessage } from '@core/chatModel';
import hash from '@core/hash';
import { contactLabel } from '../utils/contactLabel';
import { messageTimestampLabel } from '../utils/timestampLabel';

// The conversation view component
function Conversation() {
  const { pushView, popView, currentView } = useAppView();
  const { contactGroup } = currentView();
  if (!contactGroup) {
    throw 'Conversation view launched without contactGroup state';
  }

  const controller = useChatController();
  // memoise controller
  const controllerRef = React.useRef(controller);

  const [conversation, setConversation] = React.useState(controller.getConversations().get(hash(contactGroup)));
  const [msgText, setMsgText] = React.useState('');

  React.useEffect(() => {
    const myListener = new (class implements MessageListener {
      notifyMessage(msg: ChatMessage) {
        const groupHash = hash(contactGroup);
        if (hash(msg.recipients) === groupHash) {
          // incoming message was part of conversation, so update conversation
          setConversation(controllerRef.current.getConversations().get(groupHash));
        }
      }
    })();

    const curController = controllerRef.current;
    curController.addMessageListener(myListener);

    return () => {
      curController.removeMessageListener(myListener);
    };
  }, [contactGroup]);

  const handleBack = () => {
    popView();
  };

  const handleAddFriend = (npub: string) => {
    pushView('add-friend', [npub], 0);
  };

  const handleViewFriend = (npub: string, isStranger: boolean) => {
    let index = null;
    for (let i = 0; i < contactGroup.length; i++) {
      if (contactGroup[i] === npub) {
        index = i;
        break;
      }
    }
    if (index !== null) {
      if (isStranger) {
        pushView('find-friend', [npub], 0);
      } else {
        pushView('view-friend', contactGroup, index);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  const handleSend = async () => {
    try {
      const msgToSend = msgText;
      setMsgText('');
      const contacts: (ChatContact | string)[] = contactGroup.map(npub => controller.getContactByNpub(npub) ?? npub);
      if (contacts.length) {
        await controller.sendDm(contacts, msgToSend);
      }
    } catch (err) {
      //TODO - send error handling
      console.log('Send error:', err);
    }
  };

  const getParticipants = () => {
    const contacts: (ChatContact | string)[] = contactGroup.map(npub => controller.getContactByNpub(npub) ?? npub);
    const knownContacts = contacts.filter(c => typeof c !== 'string');
    const strangers = contacts.filter(c => typeof c === 'string');

    const participants = knownContacts.map(c => ({ npub: c.npub, isStranger: false }));
    for (const s of strangers) {
      participants.push({ npub: s, isStranger: true });
    }
    return participants;
  };

  return (
    <Container className="ys-auto">
      <Navbar className="mb-3" bg="light">
        <div className="d-flex align-items-center">
          <Button onClick={handleBack} className="me-3" variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>
            {contactGroup.length > 1
              ? 'Group chat'
              : 'Chat with ' + controller.getContactByNpub(contactGroup[0])
                ? contactLabel(contactGroup[0], controller)
                : 'Stranger'}
          </Navbar.Brand>

          {contactGroup.length === 1 && controller.getContactByNpub(contactGroup[0]) !== null && (
            <Button
              onClick={() => handleViewFriend(contactGroup[0], false)}
              size="lg"
              variant="link"
              className="info-button text-info"
              aria-label="Friend details"
            >
              <i className="fas fa-address-card" aria-hidden="true"></i>
            </Button>
          )}
        </div>
      </Navbar>

      {contactGroup.length === 1 && controller.getContactByNpub(contactGroup[0]) === null && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              This contact is not in your friends list.
              <br /> Add to friends?
            </Card.Text>
            <Button onClick={() => handleAddFriend(contactGroup[0])} variant="primary">
              Add
            </Button>
          </Card.Body>
        </Card>
      )}

      {contactGroup.length > 1 && (
        <div className="mb-3 d-inline-block">
          Group:{' '}
          {getParticipants().map((p, i) => (
            <Button
              key={i}
              variant={p.isStranger ? 'warning' : 'info'}
              className="m-1 d-inline-block btn-sm"
              onClick={() => handleViewFriend(p.npub, p.isStranger)}
            >
              {contactLabel(p.npub, controller)}
            </Button>
          ))}
        </div>
      )}

      <Form onSubmit={handleSubmit} className="mb-3">
        <Row>
          <Col>
            <Form.Control
              as={TextareaAutosize}
              type="text"
              placeholder="Your message"
              value={msgText}
              onChange={event => setMsgText(event.target.value)}
            />
          </Col>
          <Col xs="auto" className="ms-auto">
            <Button variant="primary" onClick={handleSend} disabled={msgText.length === 0}>
              Send
            </Button>
          </Col>
        </Row>
      </Form>

      <ListGroup>
        {conversation?.map((msg: ChatMessage, i: number) => {
          return (
            <ListGroup.Item key={i} className="px-0 border-0">
              {(msg.state === 'tx' || msg.state === 'self') && (
                <Card className="rounded-4 float-end m-0" style={{ width: 'fit-content', maxWidth: '60%' }}>
                  <Card.Body className="rounded-4 bg-primary bg-opacity-10 border-0 py-2">
                    <div className="">{msg.text}</div>
                    <div className="mt-1 fst-italic text-end" style={{ fontSize: '0.7rem' }}>
                      {messageTimestampLabel(msg)}
                    </div>
                  </Card.Body>
                </Card>
              )}
              {msg.state === 'rx' && (
                <Card className="rounded-4" style={{ width: 'fit-content', maxWidth: '60%' }}>
                  <Card.Body className="rounded-4 bg-light border-0 py-2">
                    <div className="fw-bold">{contactLabel(msg.sender, controller)}</div>
                    <div className="">{msg.text}</div>
                    <div className="mt-1 fst-italic text-end" style={{ fontSize: '0.7rem' }}>
                      {messageTimestampLabel(msg)}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Container>
  );
}

export default Conversation;
