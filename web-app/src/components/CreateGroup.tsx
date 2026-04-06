import { useState } from 'react';
import { Button, Navbar, Container, ListGroup, Form } from 'react-bootstrap';

import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import type { ChatContact } from '@core/chatModel';

function CreateGroup() {
  const controller = useChatController();

  type ContactCheckListItem = ChatContact & { checked: boolean };
  const contactCheckList: ContactCheckListItem[] = controller
    .getContactList()
    .map(c => ({ ...c, checked: false }))
    .filter(c => c.npub !== controller.getNpub());

  const [contacts, setContacts] = useState(contactCheckList);

  const { switchView, switchViewWithContacts } = useAppView();

  const handleBack = () => {
    switchView('friends');
  };

  const handleDone = () => {
    switchViewWithContacts(
      'conversation',
      contacts.filter(c => c.checked).map(c => c.npub)
    );
  };

  const handleChecked = (index: number) => {
    setContacts(
      contacts.map((c, i) => {
        if (i === index) {
          c.checked = !c.checked;
        }
        return c;
      })
    );
  };

  return (
    <Container>
      <Navbar bg="light">
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>Create chat group</Navbar.Brand>
        </div>
      </Navbar>
      <div className="mt-3 mb-3 d-inline-block">Select some friends to create a chat group.</div>
      <ListGroup>
        {contacts.map((contact, index) => (
          <ListGroup.Item key={index} action as="li" className="align-items-start">
            <Form.Check label={contact.name} checked={contact.checked} onChange={() => handleChecked(index)} />
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Button onClick={handleDone} className="my-3" variant="primary">
        Next
      </Button>
    </Container>
  );
}

export default CreateGroup;
