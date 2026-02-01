import React from 'react';
import { Button, Form, Navbar, Container } from 'react-bootstrap';

import { useChatController } from './chatControllerContext';
import { useAppView } from './appViewContext';
import type { ChatContact } from '@core/chatModel';
import ContactProfile from './ContactProfile';

function AddFriend() {

  const chatController = useChatController()
  
  const { switchView, currentContactNpub } = useAppView()

  const handleBack = () => {
    switchView('conversation', currentContactNpub)
  }
 
  
  const [contactProfile, setContactProfile] = React.useState<Record<string, string> | null>(null);
  const [profileLookupComplete, setProfileLookupDone] = React.useState<boolean>(false)
  const [contactName, setContactName] = React.useState('');
  const [contactNameInputError, setContactNameInputError] = React.useState('');

  
  const handleContactLookupDone = (_: string | null, contactProfile: Record<string, string> | null) => {
    setProfileLookupDone(true)
    setContactProfile(contactProfile)
    setContactName(contactProfile?.name ?? '')
  }
  
  const handleSave = async () => {
    if (contactName.length === 0) {
      setContactNameInputError('Name cannot be empty')
    } else if (chatController.getContactByName(contactName) !== null) {
      setContactNameInputError('You already have a friend with the same name')
    } else {
      const contact: ChatContact = {
        name: contactName,
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

        <ContactProfile contactToLookup={currentContactNpub} onLookupDone={handleContactLookupDone} />
     
        {profileLookupComplete &&
        <div>
          <div className="mb-3">
            <Form.Label>Give your friend a name:</Form.Label>
            <Form.Control 
              type="text" 
              value={contactName}
              onChange={(event) => { setContactName(event.target.value); setContactNameInputError('')}}
              isInvalid = {!!contactNameInputError}
            />
            <Form.Control.Feedback type="invalid">
              {contactNameInputError}
            </Form.Control.Feedback>
          </div>
          <Button className="mb-3" variant="primary" onClick={handleSave}>Save</Button>
        </div>}
      </Form>
    </Container>

  )
}

export default AddFriend

