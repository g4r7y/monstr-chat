import { Container, Navbar, Tab, Tabs, type ContainerProps } from 'react-bootstrap';

import Inbox from './Inbox';
import Contacts from './Contacts';
import Settings from './Settings';


const MainMenu  = ({ activeTab } : { activeTab: string }) => {
  return (
    <Container>
      <Navbar bg="light" >
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <Tabs defaultActiveKey={activeTab ?? "chats"}className="mb-3">
        <Tab eventKey="chats" title="Chats">
          <Inbox />
        </Tab>
        <Tab eventKey="friends" title="Friends">
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

