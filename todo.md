# TODO:

* General things:
  * avoid avalanche of old messages from relays on startup - persist 'last seen' timestamps for relays and use with 'since' filter on subscriptions.
  * group chat (using chat room part of nip-17)
  * conversation delete
  * reset option
  * nip78 - save app-specific data on relays
  * nip57 - lightning zaps

* Web app:
  * improve error handling e.g. on send
  * password encode secret key when saving it to IndexedDB (nip-49)
  * new message notification

* Terminal app:
  * inbox view and friends view - make it scrollable (like the conversation view)
  * inbox view - update when new message arrives
  * new message notfication





