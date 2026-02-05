import React from "react";

import { useChatController } from "../chatControllerContext";


export type Nip05AddressProps = {
  npub: string | null
  nip05: string | null,
}

function Nip05Address(props: Nip05AddressProps) {
  let { nip05, npub } = props;
  const controller = useChatController();

  const [ nip05Verified, setNip05Verified ] = React.useState(false);
  
  React.useEffect(() => {
    const verifyNip05Done = (verifiedNpub:string | null) => {
      setNip05Verified(verifiedNpub !== null && verifiedNpub === npub);
    }    

    if (nip05 && npub) {
      controller.lookupNip05Address(nip05).then(verifyNip05Done);
    }
  }, [nip05, npub]);

  return nip05 ?
    <div>
      {nip05 + ' '} 
      {nip05Verified ? 
          <span className="fas fa-check" style={{color: 'blue'}} /> :
          <span className="fas fa-xmark" style={{color: 'red'}} />
      }
    </div> 
    :
    <div />
}

export default Nip05Address;
