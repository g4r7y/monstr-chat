import { test, describe, expect, vi } from 'vitest';

import { SimplePool } from '@nostr/tools';

const mockSendReq = vi.fn();

vi.mock('./nostrReq.ts', () => ({
  sendReq: mockSendReq
}));

describe('relay monitor', () => {
  test('detects connection state changes', async () => {
    vi.useFakeTimers();

    let relayOk = true;
    const expectedHeartbeatInterval = 10000;
    const expectedRelayCheckInterval = 1000;

    mockSendReq.mockImplementation((pool: SimplePool, relay: string[], callback: () => void) => {
      if (relayOk) {
        // fake a relay response after 100ms
        setTimeout(callback, 100);
      }
    });

    // load the thing we are testing (after module mocking)
    const { default: createRelayMonitor } = await import('./relayMonitor.js');

    const stateChangeCallback = vi.fn();
    const monitor = createRelayMonitor(new SimplePool());
    monitor.start(['r1', 'r2'], stateChangeCallback);
    expect(monitor.isOnline()).equals(false);

    // tick past the first heartbeat timer
    vi.advanceTimersByTime(expectedHeartbeatInterval);
    // tick again for the relay response
    vi.advanceTimersByTime(expectedRelayCheckInterval);

    expect(monitor.isOnline()).equals(true);
    expect(stateChangeCallback.mock.calls.length).toBe(1);
    expect(stateChangeCallback.mock.calls[0][0]).toBe(true);

    // connection goes down
    relayOk = false;

    // tick past the next heartbeat timer
    vi.advanceTimersByTime(expectedHeartbeatInterval);
    // tick again for the relay response
    vi.advanceTimersByTime(expectedRelayCheckInterval);

    expect(monitor.isOnline()).equals(false);
    expect(stateChangeCallback.mock.calls.length).toBe(2);
    expect(stateChangeCallback.mock.calls[1][0]).toBe(false);

    // connection recovers
    relayOk = true;

    // tick past the next heartbeat timer
    vi.advanceTimersByTime(expectedHeartbeatInterval);
    // tick again for the relay response
    vi.advanceTimersByTime(expectedRelayCheckInterval);

    expect(monitor.isOnline()).equals(true);
    expect(stateChangeCallback.mock.calls.length).toBe(3);
    expect(stateChangeCallback.mock.calls[2][0]).toBe(true);

    monitor.stop();

    vi.useRealTimers();
  });
});
