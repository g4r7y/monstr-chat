import { URL } from 'url'

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

export { stringIsAValidUrl }