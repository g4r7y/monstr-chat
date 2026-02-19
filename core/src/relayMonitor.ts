import { SimplePool } from '@nostr/tools';
import { sendReq } from './nostrReq.js';
// import type { Timeout } from 'timers';

// how often to run the heartbeat check
const connectionCheckInterval = 10000;
// max time to wait for the relay to respond
const relayResponseTime = 1000;

export type RelayMonitor = {
  start: (relays: string[], onConnectionStateChange: (state: boolean) => void) => void;
  stop: () => void;
  isOnline: () => boolean;
};

function createRelayMonitor(pool: SimplePool): RelayMonitor {
  let onChange: ((state: boolean) => void) | null = null;
  let relays: string[] = [];

  let responded = false;
  let online = false;
  let timerHandle: NodeJS.Timeout | null = null;

  const heartbeat = () => {
    responded = false;
    const onEvent = () => {
      responded = true;
    };
    sendReq(pool, relays, onEvent);
    setTimeout(() => {
      if (online != responded) {
        // connection state change detected
        online = responded;
        if (onChange !== null) {
          onChange(online);
        }
      }
    }, relayResponseTime);
  };

  return {
    start: (r: string[], onConnectionStateChange: (state: boolean) => void) => {
      relays = r;
      onChange = onConnectionStateChange;
      timerHandle = setInterval(heartbeat, connectionCheckInterval);
    },

    stop: () => {
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
    },

    isOnline: () => online
  };
}

export default createRelayMonitor;
