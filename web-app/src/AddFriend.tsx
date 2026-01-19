import React from 'react';
import { Button, Form, Navbar } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import { useChatController } from './chatControllerContext';
import { useAppView } from './appViewContext';
import type { ChatContact } from '@core/chatModel';



function AddFriend() {

  const chatController = useChatController()
  
  const { switchView, currentContactNpub } = useAppView()

  const handleBack = () => {
    switchView('conversation')
  }
 
  
  const [contactProfile, setContactProfile] = React.useState<Record<string, string> | null>({});
  const [loaded, setLoaded] = React.useState(false);
  const [nickName, setNickName] = React.useState('');
  const [inputError, setInputError] = React.useState('');

  
  React.useEffect(() => {
    const lookupContactProfile = async () => {
      let contactProfile = await chatController.getUserProfile(currentContactNpub)
      setContactProfile(contactProfile);
      setNickName(contactProfile?.name ?? '')
      setLoaded(true)
    }
    lookupContactProfile();
  }, []);
  
  const handleSave = async () => {
    if (nickName.length === 0) {
      setInputError('Name cannot be empty')
    } else if (chatController.getContactByName(nickName) !== null) {
      setInputError('You already have a friend with the same name')
    } else {
      const contact: ChatContact = {
        name: nickName,
        npub: currentContactNpub,
        nip05: contactProfile?.nip05 ?? null,
        profileName: contactProfile?.name ?? null,
        profileAbout: contactProfile?.about ?? null,
        relays: [],
        relaysUpdatedAt: null
      }
      await chatController.setContact(contact);

      // new contact, so update subscription so we can get contact's relaylist
      await chatController.subscribeToRelayMetadata()
      await chatController.subscribeToUserMetadata()

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
          <Navbar.Brand>Add friend</Navbar.Brand>
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
        <div className="mb-3">
          {!loaded && "Checking for Nostr profile..."}
          {loaded && contactProfile === null && "Nostr profile not found"}
          {loaded && contactProfile !== null && "Found Nostr profile:"}
        </div>
        {contactProfile !== null && contactProfile.nip05 &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Nip05 address:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext truncate"
              type="text"  
              value={contactProfile.nip05 }
              disabled readOnly
            />
          </div>
        </div>}
        {contactProfile !== null && contactProfile.name &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Profile name:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext truncate"
              type="text"  
              value={contactProfile.name }
              disabled readOnly
            />
          </div>
        </div>}
        {contactProfile !== null && contactProfile.about &&
          <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">About:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext"
              type="textarea"  
              value={contactProfile.about }
              disabled readOnly
            />
            </div>
        </div>}
        {loaded &&
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
          <Button className="mb-3" variant="primary" onClick={handleSave}>Save</Button>
        </div>}
      </Form>
    </Container>

  )
}

export default AddFriend

