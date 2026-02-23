import React from 'react';
import { Button, Form, Navbar } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import type { ChatSettings, UserProfile } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import { isValidNip05Address } from '@core/validation';

function EditProfile() {
  const controller = useChatController();

  const { switchView } = useAppView();

  const handleBack = () => {
    switchView('settings#profile');
  };

  const [profileName, setProfileName] = React.useState(controller.getSettings().profile?.name ?? '');
  const [profileAbout, setProfileAbout] = React.useState(controller.getSettings().profile?.about ?? '');
  const [profileNip05, setProfileNip05] = React.useState(controller.getSettings().profile?.nip05 ?? '');
  const [nameInputError, setNameInputError] = React.useState('');
  const [aboutInputError, setAboutInputError] = React.useState('');
  const [nip05InputError, setNip05InputError] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);

  const verifyNip05 = async () => {
    if (!isValidNip05Address(profileNip05)) {
      setNip05InputError('Invalid address. It should look something like: user@domain');
      return false;
    }

    let verified = true;
    setVerifying(true);
    const npub = await controller.lookupNip05Address(profileNip05);
    try {
      if (!npub) {
        setNip05InputError('Address not found');
        verified = false;
      } else if (npub !== controller.getNpub()) {
        setNip05InputError('Address does not match your key');
        verified = false;
      }
    } catch {
      setNip05InputError('Could not check address due to connection error');
      verified = false;
    } finally {
      setVerifying(false);
    }
    return verified;
  };

  const handleSave = async () => {
    const ok = profileNip05 === '' || (await verifyNip05());
    if (ok) {
      const profile: UserProfile = { name: profileName ?? '', about: profileAbout ?? '', nip05: profileNip05 ?? '' };
      const settings: ChatSettings = controller.getSettings();
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
          <Navbar.Brand>Edit profile</Navbar.Brand>
        </div>
      </Navbar>

      <Form>
        <div className="mb-3">
          <Form.Label>Nickname:</Form.Label>
          <Form.Control
            type="text"
            value={profileName}
            onChange={event => {
              setProfileName(event.target.value);
              setNameInputError('');
            }}
            isInvalid={!!nameInputError}
          />
          <Form.Control.Feedback type="invalid">{nameInputError}</Form.Control.Feedback>
        </div>

        <div className="mb-3">
          <Form.Label>About:</Form.Label>
          <Form.Control
            type="text"
            value={profileAbout}
            onChange={event => {
              setProfileAbout(event.target.value);
              setAboutInputError('');
            }}
            isInvalid={!!aboutInputError}
          />
          <Form.Control.Feedback type="invalid">{aboutInputError}</Form.Control.Feedback>
        </div>

        <div className="mb-3">
          <Form.Label>NIP-05 address::</Form.Label>
          <Form.Control
            type="text"
            value={profileNip05}
            onChange={event => {
              setProfileNip05(event.target.value);
              setNip05InputError('');
            }}
            isInvalid={!!nip05InputError}
          />
          <Form.Control.Feedback type="invalid">{nip05InputError}</Form.Control.Feedback>
        </div>
      </Form>

      <div>{verifying ? 'Verifying NIP-05 address...' : ''}</div>
      <Button className="mt-3 me-3" variant="primary" onClick={handleSave} disabled={!!verifying}>
        Save
      </Button>
    </Container>
  );
}

export default EditProfile;
