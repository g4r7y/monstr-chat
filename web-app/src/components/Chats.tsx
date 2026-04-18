import React from 'react';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';

import type { MessageListener } from '@core/messageListener';
import type { ChatMessage } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import { getContactLabel } from '../utils/getContactLabel';

// The main inbox for all chats
function Chats() {
  const controller = useChatController();
  // memoise controller
  const controllerRef = React.useRef(controller);

  const [conversations, setConversations] = React.useState(controller.getConversations());

  React.useEffect(() => {
    const updateConversations = () => {
      setConversations(controllerRef.current.getConversations());
    };

    const myListener = new (class implements MessageListener {
      notifyMessage() {
        updateConversations();
      }
    })();

    const curController = controllerRef.current;
    curController.addMessageListener(myListener);

    return () => {
      curController.removeMessageListener(myListener);
    };
  }, []);

  const { switchViewWithContacts } = useAppView();
  const handleOpenConversation = (contactNpubs: string[]) => {
    switchViewWithContacts('conversation', contactNpubs);
  };

  return (
    <Container>
      <ListGroup>
        {conversations.size === 0 && <ListGroup.Item>You have no messages.</ListGroup.Item>}
        {Array.from(conversations.values()).map((conv: ChatMessage[], i: number) => {
          const topMsg = conv[0];
          const contactNpubs =
            topMsg.state === 'rx' && topMsg.recipients.length < 1 ? [topMsg.sender] : topMsg.recipients; // group chat
          return (
            <ListGroup.Item
              key={i}
              onClick={() => handleOpenConversation(contactNpubs)}
              action
              as="li"
              className="align-items-start"
            >
              <div className="ms-2 me-auto">
                <div className="fw-bold truncate">
                  {contactNpubs.map(c => getContactLabel(c, controller)).join(', ')}
                </div>
                <div className="truncate">{topMsg.text}</div>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Container>
  );
}

export default Chats;
