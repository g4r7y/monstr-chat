import MainMenu from './MainMenu'
import Conversation from './Conversation.tsx';
import AddFriend from './AddFriend.tsx';
import { AppViewProvider } from './AppViewProvider';
import { useAppView } from './appViewContext';
import { Container } from 'react-bootstrap';
import ViewFriend from './ViewFriend.tsx';


const MainAppView = () => {
  const appView = useAppView()
  return (
    <div>
      {appView.view === 'main' && <MainMenu />}
      {appView.view === 'conversation' && <Conversation />}
      {appView.view === 'add-friend' && <AddFriend />}
      {appView.view === 'view-friend' && <ViewFriend />}
    </div>
  )
}


function App() {
  return (
    
    <Container>
      <AppViewProvider>
        <MainAppView />
      </AppViewProvider>
    </Container>
      
  );
}

export default App
