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
  const [nickName, setNickName] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  
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
              className="form-control-plaintext"
              type="text"  
              value={currentContactNpub}
              disabled readOnly
              style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
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
              className="form-control-plaintext"
              type="text"  
              value={contactProfile.nip05 }
              disabled readOnly
              style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
            />
          </div>
        </div>}
        {contactProfile !== null && contactProfile.name &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Profile name:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext"
              type="text"  
              value={contactProfile.name }
              disabled readOnly
              style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
            />
          </div>
        </div>}
        {contactProfile !== null && contactProfile.about &&
          <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">About:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="form-control-plaintext"
              type="text"  
              value={contactProfile.about }
              disabled readOnly
              style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
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
              onChange={(event) => setNickName(event.target.value)}
            />
          </div>
           {/* TODO validate name control - not empty, not existing contact */}
          <Button className="mb-3" variant="warning" onClick={handleSave}>Save</Button>
        </div>}
      </Form>
    </Container>

  )
}

export default AddFriend

