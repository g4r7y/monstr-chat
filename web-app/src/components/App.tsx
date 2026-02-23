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
        appView.switchView('main');
      } else {
        // no key, first laucnh
        appView.switchView('welcome');
      }
    }
  };

  initialise();

  return (
    <div>
      {appView.view === 'start' && <Start />}
      {appView.view === 'welcome' && <Welcome />}
      {appView.view === 'main' && <MainMenu activeTab="chats" />}
      {appView.view === 'friends' && <MainMenu activeTab="friends" />}
      {appView.view === 'settings' && <MainMenu activeTab="settings" />}
      {appView.view === 'settings#profile' && <MainMenu activeTab="settings" activeSetting="profile" />}
      {appView.view === 'conversation' && <Conversation />}
      {appView.view === 'add-friend' && <AddFriend />}
      {appView.view === 'view-friend' && <ViewFriend />}
      {appView.view === 'find-friend' && <FindFriend />}
      {appView.view === 'edit-profile' && <EditProfile />}
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
