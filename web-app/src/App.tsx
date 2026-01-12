import MainMenu from './MainMenu'
import Conversation from './Conversation.tsx';
import { AppViewProvider } from './AppViewProvider';
import { useAppView } from './appViewContext';
import { Container } from 'react-bootstrap';


const MainAppView = () => {
  const appView = useAppView()
  return (
    <div>
      {appView.view === 'main' && <MainMenu />}
      {appView.view === 'conversation' && <Conversation />}
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
