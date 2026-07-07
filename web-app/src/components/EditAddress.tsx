import React from 'react';
import { Button, Form, InputGroup, Navbar, OverlayTrigger, Popover } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import { decode } from '@nostr/tools/nip19';

import type { ChatSettings, UserProfile } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import { isValidNip05Address } from '@core/validation';

function EditAddress() {
  const controller = useChatController();

  const { popView } = useAppView();

  const handleBack = () => {
    popView();
  };

  type EditState = 'choose' | 'register' | 'edit';
  const [editState, setEditState] = React.useState<EditState>(controller.getSettings().profile?.nip05 ? 'edit' : 'choose');
  const [profileNip05, setProfileNip05] = React.useState(controller.getSettings().profile?.nip05 ?? '');
  const [nameToRegister, setNameToRegister] = React.useState('');
  const [inputError, setInputError] = React.useState('');
  const [registering, setRegistering] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  const verifyNip05 = async () => {
    if (!isValidNip05Address(profileNip05)) {
      setInputError('Invalid address. It should look something like: user@domain');
      return false;
    }

    let verified = true;
    setVerifying(true);
    const npub = await controller.lookupNip05Address(profileNip05);
    try {
      if (!npub) {
        setInputError('Address not found');
        verified = false;
      } else if (npub !== controller.getNpub()) {
        setInputError('Address does not match your key');
        verified = false;
      }
    } catch {
      setInputError('Could not check address due to connection error');
      verified = false;
    } finally {
      setVerifying(false);
    }
    return verified;
  };

  const handleRegister = async () => {
    const name = nameToRegister.toLowerCase();
    const nip05 = `${name}@monstr.me`;
    if (!isValidNip05Address(nip05)) {
      setInputError('Name can only contain lowercase letters, numbers, hyphens, underscores or periods');
      return;
    }

    const pubkey = decode(controller.getNpub()).data as string;

    setRegistering(true);
    try {
      const response = await fetch('/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pubkey })
      });

      if (response.ok) {
        setProfileNip05(nip05);
        const settings: ChatSettings = controller.getSettings();
        const profile: UserProfile = { ...settings.profile, nip05 };
        await controller.setSettings({
          ...settings,
          profile
        });
        await controller.broadcastUserMetadata();
        handleBack();
      } else if (response.status === 409) {
        setInputError('Name is not available');
      } else if (response.status >= 400 && response.status < 500) {
        setInputError('Name could not be registered');
      } else {
        setInputError('Could not register due to a server error');
      }
    } catch {
      setInputError('Could not register due to a connection error');
    } finally {
      setRegistering(false);
    }
  };

  const handleSave = async () => {
    const ok = profileNip05 === '' || (await verifyNip05());
    if (ok) {
      const settings: ChatSettings = controller.getSettings();
      const profile: UserProfile = { ...settings.profile, nip05: profileNip05 ?? '' };
      await controller.setSettings({
        ...settings,
        profile
      });
      await controller.broadcastUserMetadata();
      handleBack();
    }
  };

  return (
    <Container>
      <Navbar bg="light">
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>Nostr address</Navbar.Brand>
        </div>
      </Navbar>

      {editState === 'choose' && (
        <div className="mt-3">
          A Nostr address makes it easy for other users to find and identify you.
          <OverlayTrigger
            trigger="click"
            rootClose
            placement="bottom"
            overlay={
              <Popover id="nip05-info-popover">
                <Popover.Body>
                  Your Nostr address links your public key to an internet domain name. 
                  Also called a NIP-05 address, it looks like an email address, for example, bob@monstr.me. 
                  A blue check-mark is shown for a verified NIP-05 address so that others can trust that it identifies the owner's key.
                </Popover.Body>
              </Popover>
            }
          >
            <Button variant="link" className="p-0 ms-2 align-baseline" aria-label="More information about Nostr addresses">
              <i className="fas fa-circle-info"></i>
            </Button>
          </OverlayTrigger>
          <br />
          <br />
          Would you like to create your own Nostr address at monstr.me?
          <br />
          <br />
          <Button className="mt-3 me-3" variant="primary" onClick={() => setEditState('register')}>
            Create address
          </Button>
          <Button className="mt-3 me-3" variant="primary" onClick={() => setEditState('edit')}>
            I have a NIP-05 address
          </Button>
        </div>
      )}

      {editState === 'register' && (
        <div>
          <Form>
            <div className="mt-3">
              <Form.Label>Choose a name:</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  type="text"
                  maxLength={24}
                  value={nameToRegister}
                  onChange={event => {
                    setNameToRegister(event.target.value);
                    setInputError('');
                  }}
                  isInvalid={!!inputError}
                />
                <InputGroup.Text>@monstr.me</InputGroup.Text>
                <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
              </InputGroup>
            </div>
          </Form>

          <div>{registering ? 'Registering NIP-05 address...' : ''}</div>
          <Button className="mt-3 me-3" variant="primary" onClick={handleRegister} disabled={!!registering}>
            Register
          </Button>
        </div>
      )}

      {editState === 'edit' && (
        <div>
          <Form>
            <div className="mt-3">
              <Form.Label>NIP-05 address:</Form.Label>
              <Form.Control
                type="text"
                value={profileNip05}
                onChange={event => {
                  setProfileNip05(event.target.value);
                  setInputError('');
                }}
                isInvalid={!!inputError}
              />
              <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
            </div>
          </Form>

          <div>{verifying ? 'Verifying NIP-05 address...' : ''}</div>
          <Button className="mt-3 me-3" variant="primary" onClick={handleSave} disabled={!!verifying}>
            Save
          </Button>
        </div>
      )}
    </Container>
  );
}

export default EditAddress;
