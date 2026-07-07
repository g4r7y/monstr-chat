import React from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';

import { decode } from '@nostr/tools/nip19';

import type { ChatSettings, UserProfile } from '@core/chatModel';
import { useChatController } from '../chatControllerContext';
import { isValidNip05Address } from '@core/validation';

export type RegisterAddressProps = {
  onDone: () => void;
  showSkipButton: boolean;
};

function RegisterAddress(props: RegisterAddressProps) {
  const { onDone, showSkipButton } = props;
  const controller = useChatController();

  const [nameToRegister, setNameToRegister] = React.useState('');
  const [inputError, setInputError] = React.useState('');
  const [registering, setRegistering] = React.useState(false);

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
        const settings: ChatSettings = controller.getSettings();
        const profile: UserProfile = { ...settings.profile, nip05 };
        await controller.setSettings({
          ...settings,
          profile
        });
        await controller.broadcastUserMetadata();
        onDone();
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

  return (
    <div>
      <Form
        onSubmit={event => {
          event.preventDefault();
          handleRegister();
        }}
      >
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
      {showSkipButton && (
        <Button className="mt-3 me-3" variant="secondary" onClick={onDone}>
          Skip
        </Button>
      )}
    </div>
  );
}

export default RegisterAddress;
