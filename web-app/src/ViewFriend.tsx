import React from 'react';
import { Button, Form, Navbar } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import TextareaAutosize from 'react-textarea-autosize';

import { useChatController } from './chatControllerContext';
import { useAppView } from './appViewContext';
import type { ChatContact } from '@core/chatModel';



function ViewFriend() {

  const chatController = useChatController()
  
  const { switchView, currentContactNpub } = useAppView()

  const handleBack = () => {
    switchView('friends')
  }

  const [contact, setContact] = React.useState<ChatContact | null>(null);
  const [nickName, setNickName] = React.useState('');
  const [inputError, setInputError] = React.useState('');
  
  React.useEffect(() => {
    const c = chatController.getContactByNpub(currentContactNpub);
    if (c) {
      setContact(c)
      setNickName(c.name)
    }
  }, []);
  
  const handleSave = async () => {
    if (nickName.length === 0) {
      setInputError('Name cannot be empty')
    } else if (nickName !== contact?.name && chatController.getContactByName(nickName) !== null) {
      setInputError('You already have a friend with the same name')
    }
    else {
      if (contact) {
        const updatedContact = {
          ...contact,
          name: nickName,
        }
        await chatController.setContact(updatedContact);
      }
      handleBack()
    }
  }
  
  return (
      <Container>
      <Navbar bg="light" >
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>{contact ? contact.name : "Unknown contact"}</Navbar.Brand>
        </div>
      </Navbar>

      <Form>

        <div className="row mt-3 mb-3">
          <Form.Label className="col-sm-2 col-form-label">Npub:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext truncate"
              type="text"  
              value={currentContactNpub}
              disabled readOnly
            />
          </div>
        </div>
        {contact?.nip05 &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Nip05 address:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext truncate"
              type="text"  
              value={contact.nip05 }
              disabled readOnly
            />
          </div>
        </div>}
        {contact?.profileName &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Profile name:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext truncate"
              type="text"  
              value={contact.profileName }
              disabled readOnly
            />
          </div>
        </div>}
        {contact?.profileAbout &&
          <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">About:</Form.Label>
          <div className="col-sm-10">
            <Form.Control as={TextareaAutosize}
              className="form-control-plaintext"
              type="textarea"  
              value={contact.profileAbout}
              disabled readOnly
            />
            </div>
        </div>}
        <div>
          <div className="mb-3">
            <Form.Label>Name:</Form.Label>
            <Form.Control 
              type="text" 
              value={nickName}
              onChange={(event) => { setNickName(event.target.value); setInputError('')}}
              isInvalid = {!!inputError}
            />
            <Form.Control.Feedback type="invalid">
              {inputError}
            </Form.Control.Feedback>
          </div>
          <Button className="mb-3" variant="primary" onClick={handleSave}>Update</Button>
        </div>
      </Form>
    </Container>

  )
}

export default ViewFriend

