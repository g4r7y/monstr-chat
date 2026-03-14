# monstr-chat

Messaging On Nostr!


## Overview

Monstr Chat is a messaging app, built on the [Nostr](https://nostr.com/) protocol.
Using Nostr means it is decentralised, using public relay servers to securely transmit and persist your encrypted messages.
You can choose which relay servers you want to use or even run your own. 
No need to sign up for an account with a third-party or use your email address or phone number as your identity.
With Nostr, your crytographic key pair is your identity, and you can use it with any other Nostr app.
Also, because Monstr Chat uses standard Nostr protocols it is inter-operable with other Nostr clients that support the same direct messaging protocols.

This project gives you two apps for the price of one:
* web-app - is a responsive single page app. Local copies of your conversations and other metadata are stored in the browser (using IndexedDB). Try it out here: [monstr-chat](https://monstr-chat.vercel.app/)
* terminal app - provides the same functionality but on the command line, storing local data in your home directory. Follow the instructions lower down to build and run it locally.

### Nostr protocol

Monstr chat uses the following [NIPs](https://github.com/nostr-protocol/nips):

* NIP-01 - basic protocol, user metadata
* NIP-05 - map Nostr keys to DNS-based internet identifiers
* NIP-06 - derive keys from BIP39 mnemonic seed phrase
* NIP-17 - private direct messages
* NIP-19 - bech32-encoded entities
* NIP-44 - encrypted payloads
* NIP-59 - seal and giftwrap events to avoid metadata leakage


## Development

This repo is divided into workspaces:

* core - common business logic and interaction with the Nostr protocol.
* terminal - command line app. Uses terminal-kit for a pleasant text-based UI.  
* web-app - Vite project, using React and Bootstrap.

Instructions below assume you are in the root of the repo.

### Requirements

node 22+

if using older node version (without native websocket support) then you need to install ws and call useWebSocketImplementation() from nostr-tools


### Terminal app

#### Build:

```npm run install```

```npm run build --workspace=terminal```

#### Run:

```npm run start --workspace=terminal```

### Web app

#### Build:

```npm run install```

```npm run build --workspace=web-app```

#### Run:

```npm run preview --workspace=web-app```

#### Run dev server:

```npm run dev --workspace=web-app```

### General

#### Run all tests:

```npm run test```

#### Lint:

```npm run lint```

#### Format code:

```npm run prettier```

#### Use a local nostr relay:

Check out: [nostream](https://github.com/Cameri/nostream).
Set your message relay in Settings to localhost (e.g. ws://localhost:8008)

