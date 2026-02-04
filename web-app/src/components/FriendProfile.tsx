import React from 'react';
import { Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap';

import { isValidNip05Address, isValidNpub } from '@core/validation';
import { useChatController } from '../chatControllerContext';


interface ContactProfileProps {
  contactToLookup: string;
  onLookupDone?: (contactNpub: string | null, contactProfile: Record<string, string> | null) => void;
}

const FriendProfile: React.FunctionComponent<ContactProfileProps> = ({ contactToLookup, onLookupDone }) => {
  const chatController = useChatController();

  const [contactProfile, setContactProfile] = React.useState<Record<string, string> | null>({});
  const [contactNpub, setContactNpub] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [contactLookupDone, setContactLookupDone] = React.useState(false);

  const findingNpub = isValidNpub(contactToLookup);
  const findingNip05 = isValidNip05Address(contactToLookup);

  React.useEffect(() => {

    const lookupContactProfile = async () => {
      setContactLookupDone(false);
      if (!contactToLookup) {
        return;
      }
      if (isValidNpub(contactToLookup)) {
        const npub = contactToLookup;
        setLoading(true);
        let contactProfile = await chatController.getUserProfile(npub);
        setContactProfile(contactProfile);
        setContactNpub(npub);
        onLookupDone?.(npub, contactProfile);
        setLoading(false);
        setContactLookupDone(true);
      } else if (isValidNip05Address(contactToLookup)) {
        const nip05 = contactToLookup;
        setLoading(true);
        const foundNpub = await chatController.lookupNip05Address(nip05);
        let contactProfile = foundNpub ? await chatController.getUserProfile(foundNpub) : null;
        setContactProfile(contactProfile);
        setContactNpub(foundNpub);
        onLookupDone?.(foundNpub, contactProfile);
        setLoading(false);
        setContactLookupDone(true);
      }
    }

    lookupContactProfile();
  }, [contactToLookup]);


  return (
    <div>
      {loading && <div className="mb-3">Looking for Nostr user...</div>}
      {contactLookupDone &&
        <div>
          {findingNip05 && contactNpub === null && <div className="mb-3"><b>Could not verify this address</b></div>}
          {findingNip05 && contactNpub && <div className="mb-3">Found Nostr user:</div>}
          {findingNpub && !contactProfile && <div className="mb-3">Couldn't find a profile for this Nostr user</div>}
          {findingNpub && contactProfile && <div className="mb-3">Found Nostr user:</div>}

          <ListGroup className="mb-3">

            {findingNpub && contactProfile?.nip05 &&
              <ListGroupItem className="list-group-item-secondary text-break">
                <Row>
                  <Col xs={4}>NIP-05 address:</Col>
                  <Col xs={8} className="truncate">{contactProfile.nip05}</Col>
                </Row>
              </ListGroupItem>}


            {findingNip05 && contactNpub &&
              <ListGroupItem className="list-group-item-secondary text-break">
                <Row>
                  <Col xs={4}>Npub:</Col>
                  <Col xs={8} className="truncate">{contactNpub}</Col>
                </Row>
              </ListGroupItem>}


            {contactProfile?.name &&
              <ListGroupItem className="list-group-item-secondary text-break">
                <Row>
                  <Col xs={4}>Nickname:</Col>
                  <Col xs={8}>{contactProfile.name}</Col>
                </Row>
              </ListGroupItem>}

            {contactProfile?.about &&
              <ListGroupItem className="list-group-item-secondary text-break">
                <Row>
                  <Col xs={4}>About:</Col>
                  <Col xs={8} className="truncate">{contactProfile.about}</Col>
                </Row>
              </ListGroupItem>}

          </ListGroup>

        </div>}
    </div>
  )
}


export default FriendProfile