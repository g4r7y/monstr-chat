import React from 'react';
import { Button, Form, Navbar, Container } from 'react-bootstrap';

import type { ChatContact } from '@core/chatModel';
import { isValidNip05Address, isValidNpub } from '@core/validation';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import FriendProfile from './FriendProfile';

function FindFriend() {

  const chatController = useChatController();

  const { switchView } = useAppView();

  const handleBack = () => {
    switchView('friends');
  }

  const handleTryAgain = () => {
    setProfileLookupDone(false);
    setContactToLookup('');
    setFindNpubOrNip05('');
  }

  // state for input fields
  const [findNpubOrNip05, setFindNpubOrNip05] = React.useState('');
  const [findInputError, setFindInputError] = React.useState('');
  const [contactName, setContactName] = React.useState('');
  const [contactNameInputError, setNameInputError] = React.useState('');

  // state for profile lookup
  const [contactToLookup, setContactToLookup] = React.useState('');
  const [profileLookupDone, setProfileLookupDone] = React.useState<boolean>(false);

  // contact state set after successful lookup
  const [contactNpub, setContactNpub] = React.useState<string | null>(null);
  const [contactProfile, setContactProfile] = React.useState<Record<string, string> | null>(null);
  const [existingContact, setExistingContact] = React.useState<ChatContact | null>(null);


  const handleContactLookupDone = (contactNpub: string | null, contactProfile: Record<string, string> | null) => {
    setProfileLookupDone(true);
    setContactNpub(contactNpub);
    setContactProfile(contactProfile);
    setContactName(contactProfile?.name ?? '');
    setExistingContact(contactNpub ? chatController.getContactByNpub(contactNpub) : null);
  }

  const handleFind = async () => {
    if (findNpubOrNip05.length === 0) {
      setFindInputError('Field cannot be empty');
    } else if (!isValidNip05Address(findNpubOrNip05) && !isValidNpub(findNpubOrNip05)) {
      setFindInputError(`Not a valid Nostr address or npub`);
    } else {
      setContactToLookup(findNpubOrNip05);
    }
  }


  const handleSave = async () => {
    if (contactName.length === 0) {
      setNameInputError('Name cannot be empty');
    } else if (chatController.getContactByName(contactName) !== null) {
      setNameInputError('You already have a friend with the same name');
    } else if (contactNpub) {
      const contact: ChatContact = {
        name: contactName,
        npub: contactNpub,
        nip05: contactProfile?.nip05 ?? null,
        profileName: contactProfile?.name ?? null,
        profileAbout: contactProfile?.about ?? null,
        relays: [],
        relaysUpdatedAt: null
      };
      await chatController.setContact(contact);

      // new contact, so update subscription so we can get contact's relaylist
      await chatController.subscribeToRelayMetadata();
      await chatController.subscribeToUserMetadata();

      handleBack();
    }
  }

  const findDisabled = () => profileLookupDone || findNpubOrNip05.length === 0;
  const handleSubmitFind = (event: React.FormEvent) => {
    event.preventDefault();
    findDisabled() || handleFind();
  };

  const saveDisabled = () => contactName.length === 0;
  const handleSubmitSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveDisabled() || handleSave();
  };

  return (
    <Container>
      <Navbar bg="light" >
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>Find friend</Navbar.Brand>
        </div>
      </Navbar>

      <Form onSubmit={handleSubmitFind}>
        <div className="mt-3 mb-3 d-inline-block">
          You can search for a user by their verified Nostr address.<br />
          This is sometimes called a NIP-05 address and looks something like: user@domain<br />
          Or you can enter their npub key.
        </div>

        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Find user:</Form.Label>
          <div className="col-sm-10">
            <Form.Control
              type="text"
              value={findNpubOrNip05}
              onChange={(event) => { setFindNpubOrNip05(event.target.value); setFindInputError('') }}
              disabled={profileLookupDone}
              isInvalid={!!findInputError}
            />
            <Form.Control.Feedback type="invalid">
              {findInputError}
            </Form.Control.Feedback>
          </div>
        </div>

        {!contactToLookup &&
          <Button className="mb-3" variant="primary" disabled={findDisabled()} onClick={handleFind}>Find</Button>
        }

      </Form>

      <div className="mb-4">
        <FriendProfile contactToLookup={contactToLookup} onLookupDone={handleContactLookupDone} />
      </div>

      {profileLookupDone && contactNpub &&
        <Form onSubmit={handleSubmitSave}>
          {!existingContact &&
            <div>
              <div className="mb-4">
                <Form.Label>Give your friend a name:</Form.Label>
                <Form.Control
                  type="text"
                  value={contactName}
                  onChange={(event) => { setContactName(event.target.value); setNameInputError('') }}
                  isInvalid={!!contactNameInputError}
                />
                <Form.Control.Feedback type="invalid">
                  {contactNameInputError}
                </Form.Control.Feedback>
              </div>
              <Button className="mb-3 me-3" variant="primary" disabled={saveDisabled()} onClick={handleSave}>Save</Button>
              <Button className="mb-3 me-3" variant="secondary" onClick={() => { setContactToLookup(''); setProfileLookupDone(false); }}>Cancel</Button>
            </div>}

          {existingContact &&
            <div className="mb-4 row">
              <Form.Label className="col-sm-2 col-form-label">Friend name:</Form.Label>
              <div className="col-sm-10">
                <Form.Control
                  type="text"
                  value={existingContact.name}
                  disabled readOnly
                />
              </div>
            </div>}

          {profileLookupDone && existingContact &&
            <div className="mb-4"><b>This user is already in your friends list</b></div>}

        </Form>
      }

      {profileLookupDone && (!contactNpub || existingContact) &&
        <Button className="mb-3" variant="primary" onClick={handleTryAgain}>Try again</Button>
      }

    </Container>

  )
}

export default FindFriend

