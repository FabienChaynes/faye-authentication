# Faye::Authentication [![Build Status](https://travis-ci.org/dimelo/faye-authentication.svg?branch=master)](https://travis-ci.org/dimelo/faye-authentication) [![Code Climate](https://codeclimate.com/github/dimelo/faye-authentication.png)](https://codeclimate.com/github/dimelo/faye-authentication)

Authentification implementation for faye

## Principle

This project implements (channel,client_id) authentication on channel subscription and publication and delegate it to an external HTTP endpoint through JWT tupple signature based on a shared secret key between Faye server and the endpoint.

On channel subscription the JS client performs an Ajax Call to an HTTP endpoint to be granted a signature that will be provided to Faye Server to connect and publish to channel. The authentication of the endpoint itself is up to you but in the general case this will be a session authenticated resource of your app and you will decide to provide the signature or not depending on your own business logic.

This signature is required for each channel and client id tupple and relies on JWT for security. The Faye server will verify the (channel,client_id) tupple signature and reject the message if the signature is incorrect or not present.

If the browser needs multiple signatures (for multiple channels), they'll automatically be batched together into one signature HTTP request to your server.

## Current support

Currently Implemented :
  - Javascript Client Extention (JQuery needed)
  - Ruby Faye Server Extension
  - Ruby Faye Client Extension
  - Ruby utils to signing messages in your webapp
  - **Want another one ? Pull requests are welcome.**

## Installation

Add this line to your application's Gemfile:

    gem 'faye-authentication'

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install faye-authentication

## Usage

### Channels requiring authentication

All channels require authentication by default, however, it is possible to provide a lambda to the faye extensions to let them know which channels are public.

### Authentication endpoint requirements

The endpoint will receive a POST request with one or more channels, and shall return a JSON document with the signatures.

The parameters sent to the endpoint are the following :

```json
{
    "messages": {
      "0": {
        "channel": "/foo",
        "clientId": "123abc"
      },
      "1": {
        "channel": "/bar",
        "clientId": "123abc"
      }
    }
}
```

If the endpoint returns an error, the messages won't be signed and the server will reject them.

You can use ``Faye::Authentication.sign`` to generate the signature from the message and a private key.

Example (For a Rails application)

```ruby
def auth
  response = params[:messages].values.map do |message|
    if current_user.can?(:read, message[:channel])
      message.merge(signature: Faye::Authentication.sign(message, FAYE_CONFIG['secret']))
    else
      message.merge(error: 'Forbidden')
    end
  end
  render json: {signatures: response}
end

```

A Ruby HTTP Client is also available for publishing messages to your faye server without the hassle of using EventMachine :

```ruby
Faye::Authentication::HTTPClient.publish('http://localhost:9290/faye', '/channel', 'data', 'your private key')
```
### Javascript client extension

Add the extension to your faye client :

```javascript
var client = new Faye.Client('http://my.server/faye');
client.addExtension(new FayeAuthentication(client));
```

By default, when sending a subscribe request or publishing a message, the extension
will issue an AJAX request to ``/faye/auth``

If you wish to change the endpoint, you can supply it as the second argument of the extension constructor, the first one being the client :
````javascript
client.addExtension(new FayeAuthentication(client, '/my_custom_auth_endpoint'));
````

If you want to specify some channels for which you don't want the extension to
call your endpoint, you can pass an options object with a ``whitelist`` key mapping
to a function :

````javascript
function channelWhitelist(channel) {
  // Allow channels beginning with /public but disallow globbing
  return (channel.lastIndexOf('/public/', 0) === 0 && channel.indexOf('*') == -1);
}

client.addExtension(new FayeAuthentication(client, '/faye/auth', {whitelist: channelWhitelist}));
````


Faye-authentication will retry each signatures request once if the first attempt failed or returned an invalid signature. The default retry delay is 1000 ms, so 1 second.
It can be configured :

````javascript
client.addExtension(new FayeAuthentication(client, '/faye/auth', {retry_delay: 200})); // 200 ms retry delay
````


### Ruby Faye server extension

Instanciate the extension with your secret key and add it to the server :

```ruby
server = Faye::RackAdapter.new(:mount => '/faye', :timeout => 15)
server.add_extension Faye::Authentication::ServerExtension.new('your shared secret key')
```

Faye::Authentication::ServerExtension expect that :
- a ``signature`` is present in the message for publish/subscribe request
- this signature is a valid JWT token
- the JWT payload contains "channel", "clientId" and a expiration timestamp "exp" that is not in the past.

Otherwise Faye Server will refuse the message.

If you want to specify some channels for which you don't want the extension require authentication, you can pass an options hash with a ``whitelist`` key mapping to a lambda :

````ruby
channel_whitelist = lambda do |channel|
  # Allow channels beginning with /public but disallow globbing
  channel.start_with?('/public/') and not channel.include?('*')
end

server = Faye::RackAdapter.new(:mount => '/faye', :timeout => 15)
server.add_extension Faye::Authentication::ServerExtension.new('your shared secret key', {whitelist: channel_whitelist})
````

### Ruby Faye client extension

This extension allows the ruby ``Faye::Client`` to auto-sign its messages before sending them to the server.

```ruby
client = Faye::Client.new('http://localhost:9292/faye')
client.add_extension Faye::Authentication::ClientExtension.new('your shared secret key')
```

## Contributing

1. Fork it ( https://github.com/dimelo/faye-authentication/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
