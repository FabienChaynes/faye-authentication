## 0.5.0
 - More extensibility regarding public channels, extensions now take an options
   hash with a whitelist lambda / function that will be called with the channel
   name so developers can implement their own logic

## 0.4.0
  - Channels beginning by ``/public/`` do not require authentication anymore,
  However, globbing with public channels still require authentication.

## 0.3.0
  - Rename ``Faye::Authentication::Extension`` to ``Faye::Authentication::ServerExtension``
  - Add extension for faye Ruby Client : ``Faye::Authentication::ClientExtension``

## 0.2.0

  - Use JWT instead of HMAC for signing the messages
  - Allow expiration of the signature
  - The client javascript extension now takes the faye client as its first parameter
