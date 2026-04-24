import React from 'react';
import { Container } from 'react-bootstrap';

import { AppViewProvider } from '../AppViewProvider';
import { useChatController } from '../chatControllerContext.ts';
import { useAppView } from '../appViewContext';
import Start from './Start.tsx';
import Welcome from './Welcome.tsx';
import MainMenu from './MainMenu';
import Conversation from './Conversation';
import AddFriend from './AddFriend';
import ViewFriend from './ViewFriend.tsx';
import FindFriend from './FindFriend.tsx';
import EditProfile from './EditProfile.tsx';
import EditRelays from './EditRelays.tsx';
import CreateGroup from './CreateGroup.tsx';

const MainAppView = () => {
  const appView = useAppView();
  const controller = useChatController();
  const [initDone, setInitDone] = React.useState(false);

  const initialise = async () => {
    if (!initDone) {
      setInitDone(true);
      const initOk = await controller.init();
      if (initOk) {
        console.log('init ok');
        await controller.connect();
        appView.switchView('chats');
      } else {
        // no key, first laucnh
        appView.switchView('welcome');
      }
    }
  };

  initialise();

  return (
    <div>
      {appView.currentView().name === 'start' && <Start />}
      {appView.currentView().name === 'welcome' && <Welcome />}
      {appView.currentView().name === 'chats' && <MainMenu activeTab="chats" />}
      {appView.currentView().name === 'friends' && <MainMenu activeTab="friends" />}
      {appView.currentView().name === 'settings' && <MainMenu activeTab="settings" />}
      {appView.currentView().name === 'settings#profile' && <MainMenu activeTab="settings" activeSetting="profile" />}
      {appView.currentView().name === 'settings#relays' && <MainMenu activeTab="settings" activeSetting="relays" />}
      {appView.currentView().name === 'settings#keys' && <MainMenu activeTab="settings" activeSetting="keys" />}
      {appView.currentView().name === 'conversation' && <Conversation />}
      {appView.currentView().name === 'add-friend' && <AddFriend />}
      {appView.currentView().name === 'view-friend' && <ViewFriend />}
      {appView.currentView().name === 'find-friend' && <FindFriend />}
      {appView.currentView().name === 'create-group' && <CreateGroup />}
      {appView.currentView().name === 'edit-profile' && <EditProfile />}
      {appView.currentView().name === 'edit-message-relays' && <EditRelays relayType="message" />}
      {appView.currentView().name === 'edit-general-relays' && <EditRelays relayType="general" />}
    </div>
  );
};

function App() {
  return (
    <Container>
      <AppViewProvider>
        <MainAppView />
      </AppViewProvider>
    </Container>
  );
}

export default App;
