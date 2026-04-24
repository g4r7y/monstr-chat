import { Button, Container, Form, Navbar } from 'react-bootstrap';
import { useAppView } from '../appViewContext';
import React from 'react';
import { useChatController } from '../chatControllerContext';
import { isValidUrl } from '@core/validation';

type EditRelaysProps = {
  relayType: 'general' | 'message';
};

const EditRelays = (props: EditRelaysProps) => {
  const { relayType } = props;

  const controller = useChatController();
  const { popView } = useAppView();

  const relaySettings =
    relayType === 'general' ? controller.getSettings().generalRelays : controller.getSettings().inboxRelays;
  const [relays, setRelays] = React.useState(relaySettings);
  const [editingIndex, setEditingIndex] = React.useState(-1);
  const [originalValue, setOriginalValue] = React.useState('');
  const [inputError, setInputError] = React.useState('');

  type SaveState = 'none' | 'saving' | 'failed';
  const [saveState, setSaveState] = React.useState<SaveState>('none');

  React.useEffect(() => {
    // move focus to corresponding input field when editing index changes
    if (editingIndex !== -1) {
      const input = document.getElementById(`input${editingIndex}`);
      input?.focus();
    }
  }, [editingIndex]);

  const handleEditRelay = (index: number) => {
    setEditingIndex(index);
    // save original in case editing is cancelled
    setOriginalValue(relays[editingIndex]);
  };

  const handleInputDone = () => {
    if (!isValidUrl(relays[editingIndex], ['ws', 'wss'])) {
      setInputError('Invalid URL');
    } else {
      setInputError('');
      setEditingIndex(-1);
    }
  };

  const handleInputCancel = () => {
    // undo changes, restore original value for current relay
    const r = Array.from(relays);
    r[editingIndex] = originalValue;
    setRelays(r);
    setInputError('');
    setEditingIndex(-1);
  };

  const handleBack = () => {
    popView();
  };

  const handleSave = async () => {
    setSaveState('saving');
    const settings = controller.getSettings();
    if (relayType === 'message') {
      const updateTimestampUtc = Date.now();
      const timeStamp = Math.floor(updateTimestampUtc / 1000);
      settings.lastSeen = { ...settings.lastSeen, relayMetadata: timeStamp };
      settings.inboxRelays = relays;
    } else {
      settings.generalRelays = relays;
    }

    const originalSettings = controller.getSettings();
    controller.setSettings(settings);

    try {
      // send out updated relay list event, whether changing inbox or general relays
      await controller.broadcastRelayList();
    } catch (_) {
      // if it fails revert and stay in view
      controller.setSettings(originalSettings);
      setSaveState('failed');
      return;
    }

    // relays updated ok, so resubscribe things
    if (relayType === 'message') {
      await controller.subscribeToIncomingDms();
    } else if (relayType === 'general') {
      await controller.subscribeToUserMetadata();
      await controller.subscribeToRelayMetadata();
      // broadcast kind0 user metadata to the potentially new general relays
      await controller.broadcastUserMetadata();
    }
    handleBack();
    setSaveState('none');
  };

  const handleAddRelay = () => {
    const updatedRelays = Array.from(relays);
    updatedRelays.push('wss://');
    setRelays(updatedRelays);
  };

  const handleRemoveRelay = (index: number) => {
    const updatedRelays = Array.from(relays);
    updatedRelays.splice(index, 1);
    setRelays(updatedRelays);
  };

  return (
    <Container>
      <Navbar bg="light">
        <div className="d-flex align-items-center">
          <Button className="me-3" onClick={handleBack} variant="outline-secondary">
            <i className="fas fa-chevron-left"></i> Back
          </Button>
          <Navbar.Brand>{relayType == 'general' ? 'Edit general relays' : 'Edit message relays'}</Navbar.Brand>
        </div>
      </Navbar>
      {relayType === 'general' && (
        <div className="mt-3">
          These relays are used to broadcast your profile and relay information so that your friends can send messages
          to you. They are also used to discover information about your friends so that you can send messages to them.
          <br />
          It is recommended to use several popular nostr relays.
        </div>
      )}
      {relayType === 'message' && (
        <div className="mt-3">
          These relays are used to receive your incoming messages.
          <br />
          It is recommended to have up to 3 of these.
        </div>
      )}
      <Form>
        {relays.map((_, i) => (
          <Form.Group key={i} controlId={`input${i}`}>
            <div className="mt-3 ms-auto d-flex">
              <Form.Control
                type="text"
                value={relays[i]}
                onChange={event => {
                  const currentRelays = Array.from(relays);
                  currentRelays[i] = event.target.value;
                  setRelays(currentRelays);
                }}
                disabled={editingIndex != i}
                isInvalid={editingIndex === i && !!inputError}
              />

              {editingIndex !== i && (
                <Button
                  disabled={editingIndex !== -1}
                  onClick={() => handleEditRelay(i)}
                  size="lg"
                  variant="link"
                  className="info-button text-primary"
                  aria-label="Edit"
                >
                  <i
                    className="fas fa-edit"
                    style={editingIndex === -1 ? {} : { opacity: 0, color: 'transparent' }}
                    aria-hidden="true"
                  ></i>
                </Button>
              )}
              {editingIndex !== i && (
                <Button
                  disabled={editingIndex !== -1}
                  onClick={() => handleRemoveRelay(i)}
                  size="lg"
                  variant="link"
                  className="text-danger"
                  aria-label="Delete"
                >
                  <i
                    className="fas fa-trash"
                    style={editingIndex === -1 ? {} : { opacity: 0, color: 'transparent' }}
                    aria-hidden="true"
                  ></i>
                </Button>
              )}

              {editingIndex === i && (
                <Button
                  onClick={handleInputDone}
                  size="lg"
                  variant="link"
                  className="info-button text-success"
                  aria-label="Ok"
                >
                  <i className="fas fa-check" aria-hidden="true"></i>
                </Button>
              )}
              {editingIndex === i && (
                <Button
                  onClick={handleInputCancel}
                  size="lg"
                  variant="link"
                  className="info-button text-danger"
                  aria-label="Cancel"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </Button>
              )}
            </div>
            <Form.Control.Feedback type="invalid">{editingIndex === i && inputError}</Form.Control.Feedback>
          </Form.Group>
        ))}
      </Form>
      <div>
        <Button
          className="mt-3 mb-3"
          variant="warning"
          onClick={handleAddRelay}
          disabled={editingIndex !== -1 || saveState === 'saving'}
        >
          <i className="fas fa-plus" aria-hidden="true"></i> Add
        </Button>
      </div>
      <div>
        <Button className="mt-3 mb-3" onClick={handleSave} disabled={editingIndex !== -1 || saveState === 'saving'}>
          Save
        </Button>
      </div>
      {saveState === 'saving' && relayType === 'general' && <div>Updating your general relays...</div>}
      {saveState === 'saving' && relayType === 'message' && (
        <div>Broadcasting your settings to your general relays...</div>
      )}
      {saveState === 'failed' && relayType === 'general' && (
        <div className="text-danger">
          Failed to reach your general relays. The relays you entered may be down or there is a problem with your
          connection.
        </div>
      )}
      {saveState === 'failed' && relayType === 'message' && (
        <div className="text-danger">
          Failed to broadcast your settings to your general relays. Your general relays may be down or there is a
          problem with your connection.
        </div>
      )}
    </Container>
  );
};

export default EditRelays;
