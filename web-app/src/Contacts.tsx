import React from 'react';
import { Button, ListGroup } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import { useChatController } from './chatControllerContext';
import type { ChatContact } from '@core/chatModel';
import { useAppView } from './appViewContext';



function Contacts() {
  const chatController = useChatController()
  const { switchView } = useAppView()
  const [ contacts ] = React.useState(chatController.getContactList())

  const handleViewFriend = (contact: ChatContact) => () => {
    switchView('view-friend', contact.npub)
  }

  const handleChat = (contact: ChatContact) => () => {
    switchView('conversation', contact.npub)
  }
  
  return (
      <Container>
        {contacts.length === 0 ?
          "No friends" : 
        <ListGroup>
          { contacts.map( (c: ChatContact) => {
            return <ListGroup.Item action as="li" className="d-flex align-items-start">
                <div className="ms-2 me-auto">
                  <div className="fw-bold">{c.name}</div>
                </div>
                <div className="ms-auto d-flex align-items-center">
                  <Button  onClick={handleViewFriend(c)} size="lg" variant="link" className="info-button text-muted">
                    <i className="fas fa-info-circle taxt-danger"></i>
                  </Button>
                  <Button  onClick={handleChat(c)} size="lg" variant="link" className="text-secondary">
                    <i className="fas fa-message text-warning"></i>
                  </Button>
                </div>
            </ListGroup.Item>
          })}
        </ListGroup>
        }
      </Container>

  )
}

export default Contacts

