import { Container, Navbar, Tab, Tabs } from 'react-bootstrap';

import Chats from './Chats';
import Friends from './Friends';
import Settings from './Settings';
import { useAppView, type AppViewNameType } from '../appViewContext';

const MainMenu = ({ activeTab, activeSetting }: { activeTab: string; activeSetting?: string }) => {
  const { switchView } = useAppView();

  const handleSwitchTab = (tabKey: string | null) => {
    if (tabKey) {
      switchView(tabKey as AppViewNameType);
    }
  };

  return (
    <Container>
      <Navbar bg="light">
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <Tabs defaultActiveKey={activeTab ?? 'chats'} className="mb-3" onSelect={handleSwitchTab}>
        <Tab eventKey="chats" title="Chats">
          <Chats />
        </Tab>
        <Tab eventKey="friends" title="Friends">
          <Friends />
        </Tab>
        <Tab eventKey="settings" title="Settings">
          <Settings activeKey={activeSetting ?? ''} />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default MainMenu;
