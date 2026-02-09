import { Accordion, Button, Card, Container, Form, Navbar } from 'react-bootstrap';

import { useChatController } from '../chatControllerContext';
import { useAppView } from '../appViewContext';
import type { ChatController } from '@core/chatController';
import React from 'react';
import { isValidBip39Phrase, isValidNsec } from '@core/validation';

// todo enum
type WelcomeState = 'intro' | 'created' | 'showMnemonic' | 'showMnemonicConfirm' | 'tips' |
  'restore' | 'restoreNsec' | 'restoreMnemonic' | 'restored'

const Welcome = () => {

  const controller: ChatController = useChatController();
  const { switchView } = useAppView();
  const [ welcomeState, setWelcomeState ] = React.useState<WelcomeState>('intro')
  const [ nsec, setNsec ] = React.useState('')
  const [ mnemonic, setMnemonic ] = React.useState('')
  const [ inputError, setInputError ] = React.useState('')
  
  const handleWelcomeDone = async () => {
    // re-initialise
    const initOk = await controller.init()
    if (initOk) {
      const connected = await controller.connect()
      console.log('Controller connect: ', connected)
      console.log('Controller npub: ', controller.getNpub())
      switchView('main')
    } //TODO handle errors
  } 
  
  const handleCreate = async () => {
    const mnemonic = await controller.createNewKey();
    setMnemonic(mnemonic);
    setWelcomeState('created');
  }

  const handleRestoreNsec = async () => {
    if (!isValidNsec(nsec)) {
      setInputError('Not a valid nsec key')
    } else {
      await controller.resetKey(nsec);
      setWelcomeState('restored'); 
    }
  }

  const handleRestoreMnemonic = async () => {
    if (!isValidBip39Phrase(mnemonic)) {
      setInputError('Not a valid combination of words')
    } else {
      // TODO verify individual words
      try {
        await controller.resetKeyFromSeedWords(mnemonic);
        setWelcomeState('restored');
      } catch {
        setInputError('Failed to restore your key from recovery phrase') 
      }
    }
  }

  return (
    <Container>
      <Navbar bg="light" >
        <Navbar.Brand>Monstr Chat</Navbar.Brand>
      </Navbar>
      {welcomeState === 'intro' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Get started
          </Card.Header>
          <Card.Body>
            <Card.Text>
              Monstr Chat is a messaging app built on Nostr. Connect with your friends and chat freely and securely.<br />
              No need to sign up for an account, or give out your phone number or email address.<br /><br />
              To get started all you need is your own Nostr key.<br />
              This is an identifier which is unique to you and allows you to securely send and receive encrypted messages.<br />
              Your Nostr key will also work with any other app that runs on Nostr.<br /><br />
              You can create your own key now or, if you already have a Nostr key, you can use that.<br />
            </Card.Text>
            <Button className="mt-3 me-3" onClick={handleCreate}>Create a key</Button>
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('restore')}>I have a key</Button>
          </Card.Body>
        </Card>
      </div>
      }
      {welcomeState === 'created' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Your new Nostr key has been created
          </Card.Header>
          <Card.Body>
            <Card.Text>
              You now have a public Nostr key (npub) and a secret Nostr key (nsec).<br />
              Your keys are saved in the Monstr Chat settings.<br />
              It is important to keep your nsec key safe and never share it with anybody else.<br />
              You should share your npub key with your friends so that they can send messages to you and read your messages.<br /><br />
              Your public Nostr key is:<br /><br />
              <div className="text-primary">{controller.getNpub()}</div>
            </Card.Text>
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('showMnemonic')}>Continue</Button>
          </Card.Body>
        </Card>
      </div>
      }
      
      {(welcomeState === 'showMnemonic' || welcomeState === 'showMnemonicConfirm') &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Save your recovery phrase
          </Card.Header>
          <Card.Body>
            <Card.Text>
              A 12 word recovery phrase has been generated for you.<br />
              You will need this in future if you ever need to restore your Nostr key.<br />
              Keep this in a safe place and do not share it with anybody.<br /> 
              When you leave this page, you will never be able to see it again.<br /><br />
              Your memorable recovery phrase is:<br /><br/>
              <div className="text-primary">{mnemonic}</div>
            </Card.Text>
            {welcomeState === 'showMnemonic' &&
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('showMnemonicConfirm')}>Continue</Button> }
            {welcomeState === 'showMnemonicConfirm' &&
            <div> 
              <div className="mt-3"> Have you written down your recovery phrase? You won't be able to see it again!</div>
              <Button className="mt-3 me-3" onClick={() => setWelcomeState('tips')}>Continue</Button> 
            </div>}
          </Card.Body>
        </Card>
      </div>
      }

      {welcomeState === 'tips' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Ready to start using using Monstr Chat
          </Card.Header>
          <Card.Body>
            <Card.Text>
              Here are some useful tips:
            </Card.Text>
            <Accordion>
              <Accordion.Item eventKey="0">
                <Accordion.Header>Relays</Accordion.Header>
                <Accordion.Body>
                  Relays are the decentralised servers that power Nostr. Make sure to check your relays in Settings. You can choose which remote Nostr relays will be used to send and receive your messages. Either stick with the defaults or change to your favourite relays.
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="1">
                <Accordion.Header>Your profile</Accordion.Header>
                <Accordion.Body>
                  You can set up your public profile so that other Nostr users can discover information about you. You can view and edit your profile in Settings.
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="2">
                <Accordion.Header>Get a verified address</Accordion.Header>
                <Accordion.Body>
                  It is recommended to create a verified Nostr address for yourself. This is called a NIP-05 address and looks a bit like an email address. It links your npub key to an internet domain name.<br />
                  A NIP-05 address makes it easier to share your identiy with other users, as it is much shorter than your npub key. A verified NIP-05 address shows with a blue check mark so that other users can trust who you are.<br />
                  There are several free services where you can get <a href="https://nostr.how/en/guides/get-verified">NIP-05 verified</a>. Once you have a NIP-05 address just add it to your profile in Settings.<br />
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
            <Button className="mt-3 me-3" onClick={handleWelcomeDone}>Start</Button> 
          </Card.Body>
        </Card>
      </div>
      }

      {welcomeState === 'restore' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Restore key
          </Card.Header>
          <Card.Body>
            <Card.Text>
              There are two ways to restore your key.<br /><br />
              You can use your Nostr secret key (nsec). It starts with 'nsec' and is 63 characters long.<br /><br />
              Or you can use your memorable recovery phrase. This is the 12 word phrase that you hopefully stored safely when you created your key.<br /><br />
              How would you like to restore your key?<br />
            </Card.Text>
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('restoreNsec')}>Nsec key</Button> 
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('restoreMnemonic')}>Recovery phrase</Button> 
          </Card.Body>
        </Card>
      </div>
      }

      {welcomeState === 'restoreNsec' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Restore key
          </Card.Header>
          <Card.Body>
            <div className="row mb-3">
            <Form.Label className="col-sm-2 col-form-label">Enter your nsec key:</Form.Label>
              <div className="col-sm-10">
                <Form.Control
                  type="text"
                  value={nsec}
                  onChange={(event) => { setNsec(event.target.value); setInputError('') }}
                  isInvalid={!!inputError}
                />
                <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
              </div>
            </div>
            <Button className="mt-3 me-3" onClick={handleRestoreNsec}>Continue</Button> 
          </Card.Body>
        </Card>
      </div>
      }

      {welcomeState === 'restoreMnemonic' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Restore key
          </Card.Header>
          <Card.Body>
            <div className="row mb-3">
            <Form.Label className="col-sm-2 col-form-label">Enter your 12-word recovery phrase:</Form.Label>
              <div className="col-sm-10">
                <Form.Control
                  type="text"
                  value={mnemonic}
                  onChange={(event) => { setMnemonic(event.target.value); setInputError('') }}
                  isInvalid={!!inputError}
                />
                <Form.Control.Feedback type="invalid">{inputError}</Form.Control.Feedback>
              </div>
            </div>
            <Button className="mt-3 me-3" onClick={handleRestoreMnemonic}>Continue</Button> 
          </Card.Body>
        </Card>
      </div>      
      }

      {welcomeState === 'restored' &&
      <div>
        <h3 className="mt-3 text-primary">Welcome!</h3>
        <Card className="mt-3">
          <Card.Header>
            Restore key
          </Card.Header>
          <Card.Body>
            <Card.Text>
               Your key has been successfully restored.
            </Card.Text>
            <Button className="mt-3 me-3" onClick={() => setWelcomeState('tips')}>Continue</Button> 
          </Card.Body>
        </Card>
      </div>
      }
    </Container>
  )
}

export default Welcome;
