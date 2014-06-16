## 0.3.0
- Rename ``Faye::Authentication::Extension`` to ``Faye::Authentication::ServerExtension``
- Add extension for faye Ruby Client : ``Faye::Authentication::ClientExtension``

## 0.2.0

  - Use JWT instead of HMAC for signing the messages
  - Allow expiration of the signature
  - The client javascript extension now takes the faye client as its first parameter
