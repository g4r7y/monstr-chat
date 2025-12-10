// import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';


import Messages from './Messages';
import Contacts from './Contacts';
import Settings from './Settings';


function MainMenu() {
  return (
    <Container>
      <Navbar bg="light" >
          <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      <Tabs defaultActiveKey="profile" className="mb-3"
      >
        <Tab eventKey="messages" title="Chats">
          <Messages />
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

