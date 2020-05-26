## 1.13
  - Fix [CVE-2020-11020](https://github.com/faye/faye/security/advisories/GHSA-qpg4-4w7w-2mq5)

## 1.12
  - No longer retry and fetch a new signature after errors unrelated to `Faye::Authentication` (#15)
  - Internal:
    - Fix rspec and jasmine specs (#14)
    - Replace `phantomjs` with `chromeheadless` for jasmine specs (#14)
    - Updated Travis settings with last ruby versions (#14)

## 1.11.0
  - Optional authentication for `Faye::Authentication::HTTPClient` (#12)

## 1.10.0
  - Remove signature from the server response (#11)

## 1.8.1
  - Fix bad parameter passed to Net::HTTP::Post in HTTP Client (thanks @evserykh)

## 1.8.0
 - Wait a delay before trying to fetch a signature after an error

## 1.7.0
 - Improve preformance by batching authentication requests (backward incompatible!)

## 1.5.0
 - Add support for faye 1.1 (unreleased for now)
 - Drop support for faye < 1.1
 - More extensibility regarding public channels, extensions now take an options
   hash with a whitelist lambda / function that will be called with the channel
   name so developers can implement their own logic

## 1.4.0
  - Channels beginning by ``/public/`` do not require authentication anymore,
  However, globbing with public channels still require authentication.

## 1.3.0
  - Rename ``Faye::Authentication::Extension`` to ``Faye::Authentication::ServerExtension``
  - Add extension for faye Ruby Client : ``Faye::Authentication::ClientExtension``

## 1.2.0

  - Use JWT instead of HMAC for signing the messages
  - Allow expiration of the signature
  - The client javascript extension now takes the faye client as its first parameter
