# monstr-chat

Messaging On Nostr!

Chat app built on the Nostr protocol.

Two apps for the price of one: web app and command line app.

## Overview

This repo is divided into workspaces:

* core - common business logic and interaction with the Nostr protocol.
* terminal - command line app. Uses terminal-kit for a pleasant text-based UI.  
* web-app - Vite project, using React and Bootstrap.

Instructions below assume you are in root of repo.

## Terminal app

### Build:

```npm run install```

```npm run build --workspace=terminal```

### Run:

```npm run start --workspace=terminal```

## Web app

### Build:

```npm run install```

```npm run build --workspace=web-app```

### Run dev server:

```npm run dev --workspace=web-app```

## Tests

```npm run test```


## Requires:

node 22

if using older node version (without native websocket support) then you need to install ws and call useWebSocketImplementation() from nostr-tools

### Use local nostr server:

Check out: [nostream](https://github.com/Cameri/nostream).
Set your message relay in Settings to localhost (e.g. ws://localhost:8008)
