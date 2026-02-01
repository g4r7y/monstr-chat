import React from 'react';
import { Button, Col, Container, Form, ListGroup, Navbar, Row, Card } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { useChatController } from './chatControllerContext';
import { useAppView } from './appViewContext';
import { type ChatController } from '@core/chatController';
import type { MessageListener } from '@core/messageListener';
import type { ChatMessage } from '@core/chatModel';

function getContactLabel(npub: string, chatController: ChatController): string {
  const contact = chatController.getContactByNpub(npub)
  return contact ? contact.name : `${npub.slice(0, 9)}..${npub.slice(-5)}`
}

function getDisplayableMessageTimestamp(msg: ChatMessage): string {
  const hoursAgo = Math.floor((Date.now() - new Date(msg.time).getTime()) / 3600000)
  const msgTime = `${msg.time.getHours()}:${String(msg.time.getMinutes()).padStart(2, '0')}`
  const msgDay = `${msg.time.toLocaleDateString()}`
  return hoursAgo > 12 ? `${msgDay} ${msgTime}` : `${msgTime}`
}


// The conversation view component
function Conversation() {

  const chatController = useChatController()
  const [ conversations, setConversations ] = React.useState(chatController.getConversations()) 
  const [ msgText, setMsgText ] = React.useState('');
    
  React.useEffect(() => {    
    const updateConversations = () => {
      setConversations(chatController.getConversations());
    };

    const myListener = new class implements MessageListener {
      notifyMessage() {
        // TODO check if message is part of this conversation
        updateConversations()
      }
    }
      
    chatController.addMessageListener(myListener)

    return () => {
      chatController.removeMessageListener(myListener)
    }
  }, [ conversations, chatController ])



  const { switchView, currentContactNpub } = useAppView()


  const handleBack = () => {
    switchView('main');
  };

  const handleAddFriend = () => {
    switchView('add-friend', currentContactNpub);
  };

  const handleViewFriend = () => {
    switchView('view-friend', currentContactNpub)
  }


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend()
  };

  const handleSend = () => {
    chatController.sendDmToNpub(currentContactNpub, msgText)
    setMsgText('')    
  };

  return (
      <Container className="ys-auto">
        <Navbar className="mb-3" bg="light">
          <div className="d-flex align-items-center">
          <Button  onClick={handleBack} className="me-3" variant="outline-secondary"><i className="fas fa-chevron-left"></i> Back</Button>
          <Navbar.Brand>Chat with {chatController.getContactByNpub(currentContactNpub) ? getContactLabel(currentContactNpub, chatController) : "Stranger"}</Navbar.Brand>
          {chatController.getContactByNpub(currentContactNpub) !== null && 
          <Button  onClick={handleViewFriend} size="lg" variant="link" className="info-button text-info">
            <i className="fas fa-address-card"></i>
          </Button>
          }  
          </div>
        </Navbar>

        {chatController.getContactByNpub(currentContactNpub) === null &&
          <Card className="mb-3 d-inline-block">
            <Card.Body>
              <Card.Text>This contact is not in your friends list.<br /> Add to friends?</Card.Text>
              <Button onClick={handleAddFriend} variant="primary">Add</Button>
            </Card.Body>
          </Card>
        }

        <Form onSubmit={handleSubmit} className="mb-3">
          <Row>
            <Col>
              <Form.Control as={TextareaAutosize}
                type="text" 
                placeholder="Your message" 
                value={msgText}
                onChange={(event) => setMsgText(event.target.value)}
              />
            </Col>
            <Col xs="auto" classname="ms-auto">
              <Button variant="primary" onClick={handleSend}>Send</Button>
            </Col>
          </Row>
        </Form>
        <ListGroup>
          { conversations.get(currentContactNpub)?.map( (msg: ChatMessage) => {
            const contactLabel = msg.state === 'tx' ? 'You' : getContactLabel(msg.sender, chatController)
            return <ListGroup.Item action as="li" className="d-flex justify-content-between align-items-start">
                <div className="ms-2 me-auto">
                  <div>{getDisplayableMessageTimestamp(msg)}</div>
                  <div className="fw-bold">{contactLabel}</div>
                  <div>{msg.text}</div>
                </div>
            </ListGroup.Item>
          })}
        </ListGroup>
      </Container>
  )
}

export default Conversation