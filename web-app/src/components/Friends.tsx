import React from 'react';
import { Button, Card, ListGroup } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import { useChatController } from '../chatControllerContext';
import type { ChatContact } from '@core/chatModel';
import { useAppView } from '../appViewContext';



function Friends() {
  const chatController = useChatController()
  const { switchView } = useAppView()
  const [ contacts ] = React.useState(chatController.getContactList())

  const handleViewFriend = (contact: ChatContact) => () => {
    switchView('view-friend', contact.npub)
  }

  const handleFindFriend = () => {
    switchView('find-friend')
  }

  const handleChat = (contact: ChatContact) => () => {
    switchView('conversation', contact.npub)
  }
  
  return (
      <Container>
        {contacts.length === 0 &&
          
          <Card className="mb-3 d-inline-block">
            <Card.Body>
              <Card.Text>You have no friends.<br /> Would you like to find somebody on Nostr?</Card.Text>
              <Button onClick={handleFindFriend} variant="primary">Find Friend</Button>
            </Card.Body>
          </Card>
        }
        {contacts.length > 0 &&
          <div>
              <Button onClick={handleFindFriend} className="mb-3" variant="primary">Find Friend</Button>

              <ListGroup>
                { contacts.map( (c: ChatContact, i: number) => {
                  return <ListGroup.Item key={i} action as="li" className="d-flex align-items-start">
                      <div className="ms-2 me-auto">
                        <div className="fw-bold">{c.name}</div>
                      </div>
                      <div className="ms-auto d-flex align-items-center">
                        <Button  onClick={handleViewFriend(c)} size="lg" variant="link" className="info-button text-info">
                          <i className="fas fa-address-card"></i>
                        </Button>
                        <Button  onClick={handleChat(c)} size="lg" variant="link" className="text-primary">
                          <i className="fas fa-message"></i>
                        </Button>
                      </div>
                  </ListGroup.Item>
                })}
              </ListGroup>

          </div>
        }
      </Container>

  )
}

export default Friends

