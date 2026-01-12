import React from 'react';
import { Button, Col, Container, Form, ListGroup, Navbar, Nav, Row } from 'react-bootstrap';

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
function Inbox() {

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



  const { switchView, currentContact } = useAppView()
  const handleBack = () => {
    switchView('main');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend()
  };


  const handleSend = () => {
    chatController.sendDmToNpub(currentContact, msgText)
    setMsgText('')    
  };

  return (
      <Container>
        <Navbar bg="light" className="mb-3">
          <Navbar.Brand>Conversation with {getContactLabel(currentContact, chatController)}</Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-secondary" onClick={handleBack}>
              &#8592; Back
            </Button>
          </Nav>
        </Navbar>

        <Form onSubmit={handleSubmit} className="mb-3">
          <Row>
            <Col>
              <Form.Control 
                type="text" 
                placeholder="Reply" 
                value={msgText}
                onChange={(event) => setMsgText(event.target.value)}
                />
            </Col>
            <Col xs="auto" classname="ms-auto">
              <Button variant="warning" onClick={handleSend}>Send</Button>
            </Col>
          </Row>
        </Form>
        <ListGroup>
          { conversations.get(currentContact)?.map( (msg: ChatMessage) => {
            const contactLabel = msg.state === 'tx' ? 'You' : getContactLabel(msg.sender, chatController)
            return <ListGroup.Item action as="li" className="d-flex justify-content-between align-items-start">
                <div className="ms-2 me-auto">
                  <div>{getDisplayableMessageTimestamp(msg)}</div>
                  <div className="fw-bold">{contactLabel}</div>
                  {msg.text}
                </div>
            </ListGroup.Item>
          })}
        </ListGroup>
      </Container>
  )
}

export default Inbox