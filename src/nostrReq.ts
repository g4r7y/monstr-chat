
import { SimplePool, SubCloser } from "@nostr/tools/pool"

let subCloser: SubCloser

// simple subscription request. to be used as ping / heartbeat for relay connection monitoring
const sendReq = (pool: SimplePool, relays: string[], callback: ()=>void ) => {
  try {
    if (subCloser) {
      subCloser.close()
    }

    subCloser = pool.subscribe(
      relays,
      {
        kinds: [1],
        limit: 1,
      }, 
      {
        id: 'simple-req-sub-id', // always use fixed sub id
        onevent: () => callback()
      })
  } catch (err) {
    // ignore errors, we don't care
    console.log('sent REQ failed with error:', err)
  }
}

export { sendReq }
