import { Container, Navbar, Tab, Tabs } from 'react-bootstrap';

import Chats from './Chats';
import Friends from './Friends';
import Settings from './Settings';


const MainMenu  = ({ activeTab } : { activeTab: string }) => {
  return (
    <Container>
      <Navbar bg="light" >
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <Tabs defaultActiveKey={activeTab ?? "chats"}className="mb-3">
        <Tab eventKey="chats" title="Chats">
          <Chats />
        </Tab>
        <Tab eventKey="friends" title="Friends">
          <Friends />
        </Tab>
        <Tab eventKey="settings" title="Settings">
          <Settings />
        </Tab>
      </Tabs>
    </Container>
)
}

export default MainMenu

