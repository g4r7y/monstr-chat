import React from 'react';

import { useChatController } from '../chatControllerContext';

export type Nip05AddressProps = {
  npub: string | null;
  nip05: string | null;
};

function Nip05Address(props: Nip05AddressProps) {
  const { nip05, npub } = props;
  const controller = useChatController();
  // memoise
  const controllerRef = React.useRef(controller);

  const [nip05Verified, setNip05Verified] = React.useState(false);

  React.useEffect(() => {
    const verifyNip05 = async (nip05: string, npub: string) => {
      const verifiedNpub = await controllerRef.current.lookupNip05Address(nip05);
      setNip05Verified(verifiedNpub !== null && verifiedNpub === npub);
    };

    if (nip05 && npub) {
      verifyNip05(nip05, npub);
    }
  }, [nip05, npub]);

  return nip05 ? (
    <div>
      {nip05 + ' '}
      {nip05Verified ? (
        <span className="fas fa-check" style={{ color: 'blue' }} />
      ) : (
        <span className="fas fa-xmark" style={{ color: 'red' }} />
      )}
    </div>
  ) : (
    <div />
  );
}

export default Nip05Address;
