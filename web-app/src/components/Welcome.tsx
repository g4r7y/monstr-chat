import { Accordion, Button, Card, Container, Form, Navbar, OverlayTrigger, Popover } from 'react-bootstrap';

import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import type { ChatController } from '@core/chatController';
import React from 'react';
import { isValidBip39Phrase, isValidNsec } from '@core/validation';
import RegisterAddress from './RegisterAddress';

// todo enum
type WelcomeState =
  | 'intro'
  | 'created'
  | 'showMnemonic'
  | 'showMnemonicConfirm'
  | 'registerNip05'
  | 'notifications'
  | 'tips'
  | 'restore'
  | 'restoreNsec'
  | 'restoreMnemonic'
  | 'restored';

const Welcome = () => {
  const controller: ChatController = useChatController();
  const { switchView } = useAppView();
  const [welcomeState, setWelcomeState] = React.useState<WelcomeState>('intro');
  const [nsec, setNsec] = React.useState('');
  const [mnemonic, setMnemonic] = React.useState('');
  const [inputError, setInputError] = React.useState('');

  const handleWelcomeDone = async () => {
    // re-initialise
    const initOk = await controller.init();
    if (initOk) {
      await controller.connect();
      switchView('chats');
    } //TODO handle errors
  };

  const handleCreate = async () => {
    const mnemonic = await controller.createNewKey();
    setMnemonic(mnemonic);
    setWelcomeState('created');
  };

  const handleRestoreNsec = async () => {
    if (!isValidNsec(nsec)) {
      setInputError('Not a valid nsec key');
    } else {
      await controller.resetKey(nsec);
      setWelcomeState('restored');
    }
  };

  const handleRestoreMnemonic = async () => {
    if (!isValidBip39Phrase(mnemonic)) {
      setInputError('Not a valid combination of words');
    } else {
      // TODO verify individual words
      try {
        await controller.resetKeyFromSeedWords(mnemonic);
        setWelcomeState('restored');
      } catch {
        setInputError('Failed to restore your key from recovery phrase');
      }
    }
  };

  return (
    <Container>
      <Navbar bg="light">
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      {welcomeState === 'intro' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Get started</Card.Header>
            <Card.Body>
              <Card.Text>
                Monstr Chat is a messaging app built on Nostr.
                <br />
                <br />
                To get started all you need is your own Nostr key.
                <br />
                <br />
                This is an identifier which is unique to you and allows you to securely send and receive encrypted
                messages. It will also work with any other app that runs on Nostr.
                <br />
                <br />
                You can create your own key now or, if you already have a Nostr key, you can use that.
                <br />
              </Card.Text>
              <Button className="mt-3 me-3" onClick={handleCreate}>
                Create a key
              </Button>
              <Button className="mt-3 me-3" onClick={() => setWelcomeState('restore')}>
                I have a key
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}
      {welcomeState === 'created' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Your new Nostr key has been created</Card.Header>
            <Card.Body>
              <Card.Text>
                You now have a public Nostr key and a secret Nostr key. Your keys are saved in the Monstr Chat settings.
                <br />
                <br />
                Your public key starts with <i>npub</i>. You should share your public key with your friends so that they
                can chat with you.
                <br />
                <br />
                Your secret key starts with <i>nsec</i>. Never share your secret key with anybody!
                <br />
                <br />
                Your public Nostr key is:
                <br />
              </Card.Text>
              <div className="text-primary">{controller.getNpub()}</div>
              <Button className="mt-4 me-3" onClick={() => setWelcomeState('showMnemonic')}>
                Continue
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {(welcomeState === 'showMnemonic' || welcomeState === 'showMnemonicConfirm') && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Save your recovery phrase</Card.Header>
            <Card.Body>
              <Card.Text>
                A 12-word recovery phrase has been generated for you.
                <br />
                <br />
                You can use this in future to restore your Nostr key. You may need to do this if you reset your browser
                or if you wish to access your messages on another device.
                <br />
                <br />
                Write it down and keep it in a safe place. Do not share it with anybody. When you leave this page, you
                will never be able to see it again.
                <br />
                <br />
                Your recovery phrase is:
                <br />
              </Card.Text>
              <div className="text-primary">{mnemonic}</div>
              {welcomeState === 'showMnemonic' && (
                <Button className="mt-3 me-3" onClick={() => setWelcomeState('showMnemonicConfirm')}>
                  Continue
                </Button>
              )}
              {welcomeState === 'showMnemonicConfirm' && (
                <div>
                  <div className="mt-3">
                    {' '}
                    Have you written down your recovery phrase? You won't be able to see it again!
                  </div>
                  <Button className="mt-3 me-3" onClick={() => setWelcomeState('registerNip05')}>
                    Continue
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'registerNip05' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Nostr address</Card.Header>
            <Card.Body>
              <Card.Text>
                A{' '}
                <OverlayTrigger
                  trigger="click"
                  rootClose
                  placement="bottom"
                  overlay={
                    <Popover id="nip05-info-popover">
                      <Popover.Body>
                        This is also called a NIP-05 address. It links your public key to an internet domain name, and
                        looks like an email address. A NIP-05 address makes it easier to share your identity with your
                        friends. Nostr apps show a blue tick for verified NIP-05 addresses.
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
                You can create your own <b className="text-green">monstr.me</b> Nostr address now, or you can set one up
                later in Settings.
                <br />
              </Card.Text>
              <RegisterAddress onDone={() => setWelcomeState('notifications')} showSkipButton={true} />
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'notifications' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Notifications</Card.Header>
            <Card.Body>
              <Card.Text>
                Enable notifications to keep updated when you receive new messages.
                <br />
                <br />
                If you enable notifications, your browser will ask for permission to show notifications from this site.
              </Card.Text>
              <Button
                className="mt-3 me-3"
                onClick={async () => {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    await controller.setSettings({
                      ...controller.getSettings(),
                      notificationsEnabled: true
                    });
                  }
                  setWelcomeState('tips');
                }}
              >
                Enable Notifications
              </Button>
              <Button className="mt-3 me-3" variant="secondary" onClick={() => setWelcomeState('tips')}>
                Skip
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'tips' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Ready to start</Card.Header>
            <Card.Body>
              <Card.Text>Here are some useful tips:</Card.Text>
              <Accordion>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Relays</Accordion.Header>
                  <Accordion.Body>
                    Relays are the servers that power Nostr. Make sure to check your relays in Settings. You can choose
                    which remote Nostr relays will be used to send and receive your messages. Either stick with the
                    defaults or change to your favourite relays.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header>Your profile</Accordion.Header>
                  <Accordion.Body>
                    You can set up your public profile so that other Nostr users can discover information about you. You
                    can view and edit your profile in Settings.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Your Nostr address</Accordion.Header>
                  <Accordion.Body>
                    It is recommended to create a Nostr address for yourself. This is called a NIP-05 address.
                    It links your public key to an internet domain name, and looks like an email address.
                    <br />
                    A NIP-05 address is human-readable, so makes it easy to share your identity with your friends. 
                    Nostr apps check that a NIP-05 address matches its key, showing a blue tick when it is verified.
                    <br />
                    Monstr Chat lets you register your own monstr.me NIP-05 address. 
                    Or you can use another <a href="https://nostr.how/en/guides/get-verified">Nostr registration service</a> to get a NIP-05 address. 
                    Either way, go to Settings to pair it up with your key.
                    <br />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              <Button className="mt-3 me-3" onClick={handleWelcomeDone}>
                Start
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'restore' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Restore your key</Card.Header>
            <Card.Body>
              <Card.Text>
                There are two ways to restore your key.
                <br />
                <br />
                You can use your Nostr secret key. It starts with 'nsec' and is 63 characters long.
                <br />
                <br />
                Or you can use your recovery phrase. This is the 12-word phrase that you hopefully stored safely when
                you created your key.
                <br />
                <br />
                How would you like to restore your key?
                <br />
              </Card.Text>
              <Button className="mt-3 me-3" onClick={() => setWelcomeState('restoreNsec')}>
                Nsec key
              </Button>
              <Button className="mt-3 me-3" onClick={() => setWelcomeState('restoreMnemonic')}>
                Recovery phrase
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'restoreNsec' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Restore your key</Card.Header>
            <Card.Body>
              <div className="row mb-3">
                <Form.Label className="col-sm-2 col-form-label">Enter your nsec key:</Form.Label>
                <div className="col-sm-10">
                  <Form.Control
                    type="text"
                    value={nsec}
                    onChange={event => {
                      setNsec(event.target.value);
                      setInputError('');
                    }}
                    isInvalid={!!inputError}
                  />
                  <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
                </div>
              </div>
              <Button className="mt-3 me-3" onClick={handleRestoreNsec}>
                Continue
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'restoreMnemonic' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Restore your key</Card.Header>
            <Card.Body>
              <div className="row mb-3">
                <Form.Label className="col-sm-2 col-form-label">Enter your 12-word recovery phrase:</Form.Label>
                <div className="col-sm-10">
                  <Form.Control
                    type="text"
                    value={mnemonic}
                    onChange={event => {
                      setMnemonic(event.target.value);
                      setInputError('');
                    }}
                    isInvalid={!!inputError}
                  />
                  <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
                </div>
              </div>
              <Button className="mt-3 me-3" onClick={handleRestoreMnemonic}>
                Continue
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {welcomeState === 'restored' && (
        <div>
          <h3 className="mt-3 text-primary">Welcome!</h3>
          <Card className="mt-3">
            <Card.Header>Restore your key</Card.Header>
            <Card.Body>
              <Card.Text>Your key has been successfully restored.</Card.Text>
              <Button className="mt-3 me-3" onClick={() => setWelcomeState('registerNip05')}>
                Continue
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
};

export default Welcome;
