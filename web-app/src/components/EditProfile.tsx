import React from 'react';
import { Button, Form, Navbar } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';

import type { ChatSettings, UserProfile } from '@core/chatModel';
import { isValidUrl } from '@core/validation';
import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';

function EditProfile() {
  const controller = useChatController();

  const { popView } = useAppView();

  const handleBack = () => {
    popView();
  };

  const [profileName, setProfileName] = React.useState(controller.getSettings().profile?.name ?? '');
  const [profileAbout, setProfileAbout] = React.useState(controller.getSettings().profile?.about ?? '');
  const [profileWebsite, setProfileWebsite] = React.useState(controller.getSettings().profile?.website ?? '');
  const [nameInputError, setNameInputError] = React.useState('');
  const [aboutInputError, setAboutInputError] = React.useState('');
  const [websiteInputError, setWebsiteInputError] = React.useState('');

  const handleSave = async () => {
    if (profileWebsite && !isValidUrl(profileWebsite, ['http', 'https'])) {
      setWebsiteInputError('Please enter a valid URL, e.g. https://example.com');
      return;
    }

    const settings: ChatSettings = controller.getSettings();
    const profile: UserProfile = {
      ...settings.profile,
      name: profileName ?? '',
      about: profileAbout ?? '',
      website: profileWebsite ?? ''
    };
    await controller.setSettings({
      ...settings,
      profile
    });
    await controller.broadcastUserMetadata();
    handleBack();
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
        <div className="mt-3 mb-3">
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
          <Form.Label>Website:</Form.Label>
          <Form.Control
            type="text"
            value={profileWebsite}
            onChange={event => {
              setProfileWebsite(event.target.value);
              setWebsiteInputError('');
            }}
            isInvalid={!!websiteInputError}
          />
          <Form.Control.Feedback type="invalid">{websiteInputError}</Form.Control.Feedback>
        </div>
      </Form>

      <Button className="mt-3 me-3" variant="primary" onClick={handleSave}>
        Save
      </Button>
    </Container>
  );
}

export default EditProfile;
