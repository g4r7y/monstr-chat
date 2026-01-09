import React, { useState } from 'react';
import { Button, Col, Container, Form, ListGroup, Navbar, Nav, Row } from 'react-bootstrap';

import { useChatController } from './chatControllerContext';
import { useAppView } from './appViewContext';
import type { ChatController } from '@core/chatController';
import type { MessageListener } from '@core/messageListener';
import type { ChatMessage, ChatContact } from '@core/chatModel';

function getContactLabel(npub: string, controller: ChatController): string {
  const contact = controller.getContactByNpub(npub)
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

  const controller = useChatController()
  const [ conversations,setConversations ] = React.useState(controller.getConversations()) 

  
  React.useEffect(() => {    
    const updateConversations = () => {
      setConversations(controller.getConversations());
    };

    const myListener = new class implements MessageListener {
      notifyMessage() {
        // TODO check if message is part of this conversation
        updateConversations()
      }
    }
      
    controller.addMessageListener(myListener)

    return () => {
      controller.removeMessageListener(myListener)
    }
  }, [ conversations, controller ])

  const [msgText, setMsgText] = useState('');


  const { switchView } = useAppView()
  const handleBack = () => {
    switchView('main');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend()
  };



  const handleSend = () => {
    const contact: ChatContact = {
      npub: 'npub1shd7ezsx5552wdvuj7pk6wsc20jarwz86shffuh7kus0her0smmsgg4ncu',
      name: 'test',
      nip05: null,
      profileName: null,
      profileAbout: null,
      relays: [],
      relaysUpdatedAt: null
    }
    controller.sendDmToContact(contact, msgText)
    setMsgText('')    
  };

  return (
      <Container>
        <Navbar bg="light" className="mb-3">
          <Navbar.Brand>Conversation with xxxx</Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-secondary" onClick={handleBack}>
              &#8592; Back
            </Button>
          </Nav>
        </Navbar>

        <Form onSubmit={handleSubmit} className="mb-3">
          <Row>
            {/* <Col xs="auto" classname="ms-auto">
              <Form.Label>Message:</Form.Label>
            </Col> */}
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
          { Array.from(conversations.values())[0].map( (msg: ChatMessage) => {
            const contactLabel = msg.state === 'tx' ? 'You' : getContactLabel(msg.sender, controller)
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