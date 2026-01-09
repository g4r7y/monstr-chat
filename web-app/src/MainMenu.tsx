import { Container, Navbar, Tab, Tabs } from 'react-bootstrap';

import Inbox from './Inbox';
import Contacts from './Contacts';
import Settings from './Settings';


function MainMenu() {
  return (
    <Container>
      <Navbar bg="light" >
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <Tabs defaultActiveKey="messages" className="mb-3">
        <Tab eventKey="messages" title="Chats">
          <Inbox />
        </Tab>
        <Tab eventKey="contacts" title="Friends">
          <Contacts />
        </Tab>
        <Tab eventKey="settings" title="Settings">
          <Settings />
        </Tab>
      </Tabs>
    </Container>
)
}

export default MainMenu

