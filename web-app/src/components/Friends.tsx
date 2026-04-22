import React from 'react';
import { Button, Card, ListGroup } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import { useChatController } from '../chatControllerContext';
import type { ChatContact } from '@core/chatModel';
import { useAppView } from '../appViewContext';

function Friends() {
  const chatController = useChatController();
  const { switchView, switchViewWithContacts } = useAppView();
  const [contacts] = React.useState(chatController.getContactList());

  const handleViewFriend = (contact: ChatContact) => () => {
    switchViewWithContacts('view-friend', [contact.npub], 0);
  };

  const handleFindFriend = () => {
    switchView('find-friend');
  };

  const handleCreateGroup = () => {
    switchView('create-group');
  };

  const handleChat = (contact: ChatContact) => () => {
    switchViewWithContacts('conversation', [contact.npub], 0);
  };

  return (
    <Container className="px-0">
      {contacts.length === 0 && (
        <Card className="mb-3 d-inline-block">
          <Card.Body>
            <Card.Text>
              You have no friends.
              <br /> Would you like to find somebody on Nostr?
            </Card.Text>
            <Button onClick={handleFindFriend} variant="primary">
              Find Friend
            </Button>
          </Card.Body>
        </Card>
      )}

      {contacts.length > 0 && (
        <div>
          <Button onClick={handleFindFriend} className="mb-3" variant="primary">
            Find Friend
          </Button>
          <Button onClick={handleCreateGroup} className="mb-3 ms-3" variant="primary">
            Create Group
          </Button>

          <ListGroup>
            {contacts.map((c: ChatContact, i: number) => {
              return (
                <ListGroup.Item key={i} action as="li" className="d-flex align-items-start">
                  <div className="ms-2 me-auto">
                    <div className="fw-bold">{c.name}</div>
                  </div>
                  <div className="ms-auto d-flex align-items-center">
                    <Button
                      onClick={handleViewFriend(c)}
                      size="lg"
                      variant="link"
                      className="info-button text-info"
                      aria-label="Friend details"
                    >
                      <i className="fas fa-address-card" aria-hidden="true"></i>
                    </Button>
                    <Button
                      onClick={handleChat(c)}
                      size="lg"
                      variant="link"
                      className="text-primary"
                      aria-label="Chat with friend"
                    >
                      <i className="fas fa-message" aria-hidden="true"></i>
                    </Button>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>
      )}
    </Container>
  );
}

export default Friends;
