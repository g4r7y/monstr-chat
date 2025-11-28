import { URL } from 'url'
import { decode } from '@nostr/tools/nip19'
import { isNip05 } from '@nostr/tools/nip05'
import { validateWords } from '@nostr/tools/nip06'
import { wordlist } from '@scure/bip39/wordlists/english'

const isValidUrl = (str: string, protocols: string[] = []) : boolean => {
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

const isValidNpub = (npub: string) : boolean => {
    try {
        const decoded = decode(npub)
        return decoded.type === 'npub'
    } catch (error) {
        return false
    }
}

const isValidNsec = (nsec: string) : boolean => {
    try {
        const decoded = decode(nsec)
        return decoded.type === 'nsec'
    } catch (error) {
        return false
    }
}

const isValidNip05Address = (addr: string) : boolean => {
    return isNip05(addr)
}

const isValidBip39Word = (word: string) : boolean => {
    return wordlist.includes(word)
}

const isValidBip39Phrase = (words: string) : boolean => {
    return validateWords(words)
}

export { isValidUrl, isValidNpub, isValidNsec, isValidNip05Address, isValidBip39Word, isValidBip39Phrase }