import React from 'react';
import { Form } from 'react-bootstrap';

import { isValidNip05Address, isValidNpub } from '@core/validation';
import { useChatController } from '../chatControllerContext';


interface ContactProfileProps {
  contactToLookup:  string;
  onLookupDone?: (contactNpub: string | null, contactProfile: Record<string, string> | null ) => void;
}

const FriendProfile : React.FunctionComponent<ContactProfileProps> = ({ contactToLookup, onLookupDone }) => { 
  const chatController = useChatController()

  const [contactProfile, setContactProfile] = React.useState<Record<string, string> | null>({});
  const [contactNpub, setContactNpub] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [profileLoaded, setProfileLoaded] = React.useState(false);

 
  React.useEffect(() => {

    const lookupContactProfile = async () => {
      setProfileLoaded(false)
      if (!contactToLookup) {
        return
      }
      console.log('lookup')
      if (isValidNpub(contactToLookup)) {
        const npub = contactToLookup;
        setLoading(true);
        let contactProfile = await chatController.getUserProfile(npub);
        setContactProfile(contactProfile);
        setContactNpub(npub);
        onLookupDone?.(npub, contactProfile);
        setLoading(false);
        setProfileLoaded(true);
      } else if (isValidNip05Address(contactToLookup)) {
        const nip05 = contactToLookup;
        setLoading(true);
        const foundNpub = await chatController.lookupNip05Address(nip05);
        let contactProfile = foundNpub ? await chatController.getUserProfile(foundNpub) : null
        setContactProfile(contactProfile);
        setContactNpub(foundNpub);
        onLookupDone?.(foundNpub, contactProfile);
        setLoading(false)
        setProfileLoaded(true);
      }
    }

    lookupContactProfile();
  }, [contactToLookup]);


  return  (
    <div>
      <div className="mb-3">
        {loading && <div>Looking for Nostr profile...</div>}
        {profileLoaded && contactProfile === null && isValidNpub(contactToLookup) && <div>Nostr profile was not found for this user</div>}
        {profileLoaded && contactProfile === null && isValidNip05Address(contactToLookup) && <div><b>Could not verify this address</b></div>}
        {profileLoaded && contactProfile !== null && <div>Found Nostr profile:</div>}
      </div>
      {profileLoaded &&
      <div>
        {contactProfile?.nip05 &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">NIP-05 address:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="truncate"
              type="text"  
              value={contactProfile.nip05}
              disabled readOnly
            />
          </div>
        </div>}
        {contactProfile?.name &&
        <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Profile name:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="truncate"
              type="text"  
              value={contactProfile.name}
              disabled readOnly
            />
          </div>
        </div>}
        {contactProfile?.about &&
          <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">About:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              type="textarea"  
              value={contactProfile.about}
              disabled readOnly
            />
          </div>
        </div>}
        {contactProfile && contactNpub &&
          <div className="row mb-3">
          <Form.Label className="col-sm-2 col-form-label">Npub:</Form.Label>
          <div className="col-sm-10">
            <Form.Control 
              className="truncate"
              type="text"  
              value={contactNpub}
              disabled readOnly
            />
          </div>
        </div>}
      </div>}
    </div>
  )
}


export default FriendProfile