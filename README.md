## monstr-chat

Messaging On Nostr!

Command line chat app built on the Nostr protocol.

### Build:

```npx tsc```

This will compile the ts code and output to the dist folder.

### Run:

```node dist/main.js```

### Requires:

node 22

if using older node version (without native websocket support) then you need to install ws and call useWebSocketImplementatio() from nostr-tools

### Use local nostr server:

Check out: [nostream](https://github.com/Cameri/nostream).
Set your message relay in Settings to localhost (e.g. ws://localhost:8008)
