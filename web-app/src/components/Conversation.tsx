import React from 'react';
import { Button, Col, Container, Form, ListGroup, Navbar, Row, Card } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import type { MessageListener } from '@core/messageListener';
import type { ChatContact, ChatMessage } from '@core/chatModel';
import hash from '@core/hash';
import { getContactLabel } from '../utils/getContactLabel';

function getDisplayableMessageTimestamp(msg: ChatMessage): string {
  const hoursAgo = Math.floor((Date.now() - new Date(msg.time).getTime()) / 3600000);
  const msgTime = `${msg.time.getHours()}:${String(msg.time.getMinutes()).padStart(2, '0')}`;
  const msgDay = `${msg.time.toLocaleDateString()}`;
  return hoursAgo > 12 ? `${msgDay} ${msgTime}` : `${msgTime}`;
}

// The conversation view component
function Conversation() {
  const { switchView, switchViewWithContacts, currentContactGroup } = useAppView();

  const controller = useChatController();
  // memoise controller
  const controllerRef = React.useRef(controller);

  const [conversation, setConversation] = React.useState(controller.getConversations().get(hash(currentContactGroup)));
  const [msgText, setMsgText] = React.useState('');

  React.useEffect(() => {
    const myListener = new (class implements MessageListener {
      notifyMessage(msg: ChatMessage) {
        const groupHash = hash(currentContactGroup);
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
  }, [currentContactGroup]);

  const handleBack = () => {
    switchView('main');
  };

  const handleAddFriend = () => {
    switchViewWithContacts('add-friend', currentContactGroup, 0);
  };

  const handleViewFriend = (npub: string, isStranger: boolean) => {
    let index = null;
    for (let i = 0; i < currentContactGroup.length; i++) {
      if (currentContactGroup[i] === npub) {
        index = i;
        break;
      }
    }
    if (index !== null) {
      if (isStranger) {
        switchViewWithContacts('find-friend', [npub], 0);
      } else {
        switchViewWithContacts('view-friend', currentContactGroup, index);
      }
    }
    //TODO - do something with stranger
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  const handleSend = async () => {
    try {
      const msgToSend = msgText;
      setMsgText('');
      const contacts: (ChatContact | string)[] = currentContactGroup.map(
        npub => controller.getContactByNpub(npub) ?? npub
      );
      if (contacts.length) {
        await controller.sendDm(contacts, msgToSend);
      }
    } catch (err) {
      //TODO - send error handling
      console.log('Send error:', err);
    }
  };

  const getParticipants = () => {
    const contacts: (ChatContact | string)[] = currentContactGroup.map(
      npub => controller.getContactByNpub(npub) ?? npub
    );
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
            {currentContactGroup.length > 1
              ? 'Group chat'
              : 'Chat with ' + controller.getContactByNpub(currentContactGroup[0])
                ? getContactLabel(currentContactGroup[0], controller)
                : 'Stranger'}
          </Navbar.Brand>

          {currentContactGroup.length === 1 && controller.getContactByNpub(currentContactGroup[0]) !== null && (
            <Button
              onClick={() => handleViewFriend(currentContactGroup[0], false)}
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

      {currentContactGroup.length === 1 && controller.getContactByNpub(currentContactGroup[0]) === null && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              This contact is not in your friends list.
              <br /> Add to friends?
            </Card.Text>
            <Button onClick={handleAddFriend} variant="primary">
              Add
            </Button>
          </Card.Body>
        </Card>
      )}

      {currentContactGroup.length > 1 && (
        <div className="mb-3 d-inline-block">
          Group:{' '}
          {getParticipants().map((p, i) => (
            <Button
              key={i}
              variant={p.isStranger ? 'danger' : 'info'}
              className="ms-2 d-inline-block btn-sm"
              onClick={() => handleViewFriend(p.npub, p.isStranger)}
            >
              {getContactLabel(p.npub, controller)}
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
          const contactLabel = msg.state === 'tx' ? 'You' : getContactLabel(msg.sender, controller);
          return (
            <ListGroup.Item key={i} action as="li" className="d-flex justify-content-between align-items-start">
              <div className="ms-2 me-auto">
                <div>{getDisplayableMessageTimestamp(msg)}</div>
                <div className="fw-bold">{contactLabel}</div>
                <div>{msg.text}</div>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Container>
  );
}

export default Conversation;
