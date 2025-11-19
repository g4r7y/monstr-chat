import { URL } from 'url'
import { decode } from '@nostr/tools/nip19'
import { isNip05 } from '@nostr/tools/nip05'

const stringIsAValidUrl = (str: string, protocols: string[] = []) : boolean => {
    try {
        let url = new URL(str)
        if (protocols.length>0 && url.protocol) {
          return protocols.map(x => `${x.toLowerCase()}:`).includes(url.protocol)
        }
        return true
    } catch (err) {
        return false
    }
}

const stringIsValidNpub = (npub: string) : boolean => {
    try {
        const decoded = decode(npub)
        return decoded.type === 'npub'
    } catch (error) {
        return false
    }
}

const stringIsValidNsec = (nsec: string) : boolean => {
    try {
        const decoded = decode(nsec)
        return decoded.type === 'nsec'
    } catch (error) {
        return false
    }
}

const stringIsValidNostrAddress = (addr: string) : boolean => {
    return isNip05(addr)
}


export { stringIsAValidUrl, stringIsValidNpub, stringIsValidNsec, stringIsValidNostrAddress }