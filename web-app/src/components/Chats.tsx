import React from 'react';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';

import type { ChatController } from '@core/chatController';
import type { MessageListener } from '@core/messageListener';
import type { ChatMessage } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';

function getContactLabel(npub: string, controller: ChatController): string {
  const contact = controller.getContactByNpub(npub)
  return contact ? contact.name : `${npub.slice(0, 9)}..${npub.slice(-5)}`
}

// The main inbox for all chats
function Chats() {

  const controller = useChatController()
  const [ conversations, setConversations ] = React.useState(controller.getConversations()) 

  React.useEffect(() => {
    const updateConversations = () => {
      setConversations(controller.getConversations());
    };
    
    const myListener = new class implements MessageListener {
      notifyMessage() {
        updateConversations()
      }
    }
    controller.addMessageListener(myListener)

    return () => {
      controller.removeMessageListener(myListener)
    }
  }, [])


  const { switchView } = useAppView()
  const handleOpenConversation = (contactNpub: string) => {
    switchView('conversation', contactNpub);
  };

  return (
      <Container>
        <ListGroup>
          {conversations.size === 0 &&
            <ListGroup.Item>You have no messages.</ListGroup.Item>
          }
          { Array.from(conversations.values()).map( (conv: ChatMessage[], i: number) => {
            const topMsg = conv[0]
            const contactNpub = topMsg.state === 'tx' ? topMsg.receiver : topMsg.sender
            return <ListGroup.Item key={i} onClick={() => handleOpenConversation(contactNpub)} action as="li" className="align-items-start">
                <div className="ms-2 me-auto">
                  <div className="fw-bold truncate">{getContactLabel(contactNpub, controller)}</div>
                  <div className="truncate">{topMsg.text}</div>
                </div>
            </ListGroup.Item>
          })}
        </ListGroup>
      </Container>
  )
}

export default Chats

