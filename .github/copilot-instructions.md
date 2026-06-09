# monstr-chat — Copilot Instructions

## Project overview

Monstr Chat is a decentralised messaging app built on the [Nostr](https://nostr.com/) protocol. It uses NIP-17 private direct messages with NIP-44 encryption and NIP-59 giftwrap to avoid metadata leakage. The user's cryptographic key pair is their identity. There is a webapp and a CLI app.

## Repo structure

This is an npm workspaces monorepo with three packages:

| Workspace | Package name | Purpose |
|---|---|---|
| `core/` | `monstr-chat-core` | Shared business logic, Nostr protocol interaction. No UI dependencies. |
| `terminal/` | `monstr-chat-terminal` | CLI app using `terminal-kit`. Depends on `core`. |
| `web-app/` | `monstr-chat-web` | Vite + React 19 + Bootstrap SPA. Depends on `core`. Stores data in IndexedDB. |

## Key architecture

- **`core/src/chatController.ts`** — main facade/interface for all app logic. Both apps instantiate this.
- **`core/src/chatModel.ts`** — in-memory state: contacts, messages, settings. Persisted via `DataStore`.
- **`core/src/dataStore.ts`** — abstract persistence interface. Each app provides its own implementation (`localStore.ts` in terminal, `localDbStore.ts` in web-app).
- **`core/src/keyStore.ts`** — abstract key storage interface.
- **`core/src/nostrSendDm.ts`** / **`nostrReceiveDm.ts`** — NIP-17 DM send/receive.
- **`core/src/nostrRelayMetadata.ts`** / **`nostrUserMetadata.ts`** — relay list and user profile management.
- **`core/src/relayMonitor.ts`** — tracks relay connection status.
- **`core/src/messageListener.ts`** / **`settingsListener.ts`** — observer interfaces for UI updates.

## Nostr NIPs used

NIP-01, NIP-05, NIP-06, NIP-17, NIP-19, NIP-44, NIP-59

## Tech stack

- **Language**: TypeScript (ESM), node 22+
- **Nostr library**: `@nostr/tools` (JSR package `@jsr/nostr__tools`)
- **Key derivation**: `@scure/bip39` (BIP39 mnemonic → NIP-06)
- **Web**: Vite 7, React 19, react-router-dom 7, Bootstrap 5, SCSS
- **Terminal**: terminal-kit 3
- **Testing**: Vitest
- **Linting**: ESLint + typescript-eslint; 
- **Formatting**: Prettier

## Common commands (run from repo root)

```bash
npm install                                  # install all workspaces
npm run test                                 # run all tests (core + terminal)
npm run build                                # build terminal + web-app
npm run lint                                 # type-check + lint all workspaces
npm run prettier                             # format all workspaces

npm run build --workspace=terminal           # build just the terminal app
npm run build --workspace=web-app            # build just the web app  

npm run dev --workspace=web-app              # start the Vite dev server
```

## Conventions

- All source files use `.ts` / `.tsx` with strict TypeScript.
- ESM modules throughout — use `.js` extensions in imports (TypeScript resolves to `.ts`).
- Relay URLs are always normalised via `normalizeURL()` from `@nostr/tools/utils`.
- Private fields use the `#` prefix convention (native JS private fields).
- Prefer a functional coding style.

## How to work

- Always ask for confirmation before making any code changes.
- After making changes, run `npm run test` and `npm run lint` from the repo root to verify correctness.
- New `core/` functionality should be accompanied by unit test file alongside the source file, using vitest.
- Common business logic belongs in `core/`, along with Nostr protocol interaction.
- Keep `core/` free of UI and platform-specific code.
- UI layers (`web-app/`, `terminal/`) should only call `ChatController` methods — do not access `ChatModel` directly from UI code.
- New `ChatController` methods must be declared on the `ChatController` interface in `chatController.ts` before implementing them.
- New web-app UI goes in `web-app/src/components/`. Wire new features through `ChatController`, and expose any new state via the existing listener interfaces (`MessageListener`, `SettingsListener`) rather than polling or reaching into the model
