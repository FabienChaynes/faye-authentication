# Faye::Authentication [![Build Status](https://travis-ci.org/dimelo/faye-authentication.svg?branch=master)](https://travis-ci.org/dimelo/faye-authentication) [![Code Climate](https://codeclimate.com/github/dimelo/faye-authentication.png)](https://codeclimate.com/github/dimelo/faye-authentication)

Authentification implementation for faye

## Principle

This project implements (channel,client_id) authentication on channel subscription and publication and delegate it to an external HTTP endpoint through HMAC tupple signature based on a shared secret key between Faye server and the endpoint.

On channel subscription the JS client performe an Ajax Call to an HTTP endpoint (JQuery needed) to be granted a signature that will be provided to Faye Server to connect and publish to channel.

This signature is required and valid for each channel and client id tupple and rely on HMAC for security.
 
The Faye server will verify the (channel,client_id) tupple signature and reject the message if the signature 
is incorrect or not present.

## Current support

Currently Implemented :
  - Javascript Client Extention
  - Ruby Faye Server Extension
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

### Authentication endpoint requirements

The endpoint will receive a POST request, and shall return a JSON hash with a ``signature`` key.

The parameters sent to the endpoint are the following :

````
{
  'message' =>
    {
      'channel'   => '/foo/bar',
      'clientId'  => '123abc'
    }
}
````

If the endpoint returns an error, the message won't be signed and the server will reject it.

You can use ``Faye::Authentication.sign`` to generate the signature from the message and a private key.

Example (For a Rails application)

````ruby
def auth
  if current_user.can?(:read, params[:message][:channel])
    render json: {signature: Faye::Authentication.sign(params[:message], 'your shared secret key')}
  else
    render json: {error: 'Not authorized'}, status: 403
  end
end

````

A Ruby HTTP Client is also available for publishing messages to your faye server
without the hassle of using EventMachine :

````ruby
Faye::Authentication::HTTPClient.publish('http://localhost:9290/faye', '/channel', 'data', 'your private key')
````
### Javascript client extension

Add the extension to your faye client :

````javascript
var client = new Faye.Client('http://my.server/faye');
client.add_extension(new FayeAuthentication());
````

By default, when sending a subscribe request or publishing a message, the extension
will issue an AJAX request to ``/faye/auth``

If you wish to change the endpoint, you can supply it as the first argument of the extension constructor :

    client.add_extension(new FayeAuthentication('/my_custom_auth_endpoint'));

### Faye server extension

Instanciate the extension with your secret key and add it to the server :

````ruby
server = Faye::RackAdapter.new(:mount => '/faye', :timeout => 15)
server.add_extension Faye::Authentication::Extension.new('your shared secret key')
````

## Contributing

1. Fork it ( https://github.com/dimelo/faye-authentication/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
