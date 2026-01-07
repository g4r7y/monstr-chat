import MainMenu from './MainMenu'
import Conversation from './Conversation.tsx';
import { AppViewProvider } from './AppViewProvider';
import { useAppView } from './appViewContext';
import { Container, Navbar } from 'react-bootstrap';


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
      <Navbar bg="light" >
          <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <AppViewProvider>
        <MainAppView />
      </AppViewProvider>
    </Container>
      
  );
}

export default App
