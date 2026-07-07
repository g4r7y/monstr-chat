import React from 'react';
import { Button, Form, Navbar, OverlayTrigger, Popover } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import type { ChatSettings, UserProfile } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import { isValidNip05Address } from '@core/validation';
import RegisterAddress from './RegisterAddress';

function EditAddress() {
  const controller = useChatController();

  const { popView } = useAppView();

  const handleBack = () => {
    popView();
  };

  type EditState = 'choose' | 'register' | 'edit';
  const [editState, setEditState] = React.useState<EditState>(
    controller.getSettings().profile?.nip05 ? 'edit' : 'choose'
  );
  const [profileNip05, setProfileNip05] = React.useState(controller.getSettings().profile?.nip05 ?? '');
  const [inputError, setInputError] = React.useState('');
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
          A{' '}
          <OverlayTrigger
            trigger="click"
            rootClose
            placement="bottom"
            overlay={
              <Popover id="nip05-info-popover">
                <Popover.Body>
                  This is also called a NIP-05 address. It links your public key to an internet domain name, and looks
                  like an email address. A NIP-05 address makes it easier to share your identity with your friends.
                  Nostr apps show a blue tick for verified NIP-05 addresses.
                </Popover.Body>
              </Popover>
            }
          >
            <a
              href="#"
              className="info-link"
              onClick={event => event.preventDefault()}
              aria-label="Information about Nostr addresses"
            >
              Nostr address
            </a>
          </OverlayTrigger>{' '}
          makes it easy for other users to find and identify you.
          <br />
          <br />
          Would you like to create your own <b className="text-green">monstr.me</b> Nostr address?
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

      {editState === 'register' && <RegisterAddress onDone={handleBack} showSkipButton={false} />}

      {editState === 'edit' && (
        <div>
          <Form
            onSubmit={event => {
              event.preventDefault();
              handleSave();
            }}
          >
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
