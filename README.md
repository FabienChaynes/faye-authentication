# Faye::Authentication

Authentification implementation for faye

Currently Implemented :
  - Javascript Client Extention
  - Ruby Server Extension
  - Ruby utils for signing messages
  - **Want another one ? Pull requests are welcome.**

The authentication is performed through an Ajax Call to the webserver (JQuery needed).

For each channel and client id pair, a signature is added to the message.

Thanks to a shared key, the Faye Server will check the signature and reject the
message if the signature is incorrect or not present.

## Installation

Add this line to your application's Gemfile:

    gem 'faye-authentication'

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install faye-authentication

## Usage

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


### Ruby utils

The endpoint will a POST request, and shall return a JSON hash with a ``signature`` key.

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
    render json: {signature: Faye::Authentication.sign(message, 'your private key')}
  else
    render json: {error: 'Not authorized'}, status: 403
  end
end

````

## Contributing

1. Fork it ( https://github.com/dimelo/faye-authentication/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
