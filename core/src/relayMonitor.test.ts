import { test, describe, mock } from "node:test";
import assert from "node:assert";

import { SimplePool } from "@nostr/tools";

describe('relay monitor', () => {

  test('detects connection state changes', async () => {
    mock.timers.enable();

    let relayOk = true
    const expectedHeartbeatInterval = 10000
    const expectedRelayCheckInterval = 1000

    mock.module('./nostrReq.ts', {
      namedExports: {
        sendReq: (pool: SimplePool, relay: string[], callback: ()=>void) => { 
          if (relayOk) {
            // fake a relay response after 100ms
            setTimeout(callback, 100)
          }
        }
      }
    } as any)

    // load the thing we are testing (after module mocking)
    const { default: createRelayMonitor } = await import('./relayMonitor.js')
    
    let stateChangeCallback = mock.fn()
    let monitor = createRelayMonitor(new SimplePool())
    monitor.start(['r1','r2'], stateChangeCallback)
    assert.strictEqual(monitor.isOnline(), false)

    // tick past the first heartbeat timer
    mock.timers.tick(expectedHeartbeatInterval);
    // tick again for the relay response
    mock.timers.tick(expectedRelayCheckInterval);

    assert.strictEqual(monitor.isOnline(), true)
    assert.equal(stateChangeCallback.mock.calls.length, 1);
    assert.strictEqual(stateChangeCallback.mock.calls[0].arguments[0], true);
    
    // connection goes down
    relayOk = false
    
    // tick past the next heartbeat timer
    mock.timers.tick(expectedHeartbeatInterval);
    // tick again for the relay response
    mock.timers.tick(expectedRelayCheckInterval);
    
    assert.strictEqual(monitor.isOnline(), false)
    assert.equal(stateChangeCallback.mock.calls.length, 2);
    assert.strictEqual(stateChangeCallback.mock.calls[1].arguments[0], false);

    // connection recovers
    relayOk = true

    // tick past the next heartbeat timer
    mock.timers.tick(expectedHeartbeatInterval);
    // tick again for the relay response
    mock.timers.tick(expectedRelayCheckInterval);
    
    assert.strictEqual(monitor.isOnline(), true)
    assert.equal(stateChangeCallback.mock.calls.length, 3);
    assert.strictEqual(stateChangeCallback.mock.calls[2].arguments[0], true);

    monitor.stop()

    mock.timers.reset();
  })
})