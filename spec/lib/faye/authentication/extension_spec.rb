require 'spec_helper'
require 'faye/authentication/server_extension'

describe Faye::Authentication::ServerExtension do

  let(:secret) { 'macaroni' }
  let(:extension) { Faye::Authentication::ServerExtension.new(secret) }

  it 'does not add an eror if the message is correctly signed' do
    message = {'channel' => '/foo/bar', 'clientId' => '42', 'text' => 'whatever'}
    signature = Faye::Authentication.sign(message, secret)
    message['signature'] = signature

    result = nil

    extension.incoming(message, ->(m) { result = m });

    expect(result).to_not have_key('error')
  end

  it 'adds an eror if the message is not signed' do
    message = {'channel' => '/foo/bar', 'clientId' => '42', 'text' => 'whatever'}
    result = nil
    extension.incoming(message, ->(m) { result = m });

    expect(result).to have_key('error')
  end

  it 'adds an error if the signature is incorrect' do
    message = {'channel' => '/foo/bar', 'clientId' => '42', 'text' => 'whatever', 'signature' => 'hello'}
    result = nil
    extension.incoming(message, ->(m) { result = m });

    expect(result).to have_key('error')
  end

  ['/meta/handshake', '/meta/connect', '/meta/unsubscribe', '/meta/disconnect'].each do |channel|
    it "does not check the signature for #{channel}" do
      message = {'channel' => channel, 'clientId' => '42', 'text' => 'whatever', 'signature' => 'hello'}
      expect(Faye::Authentication).to_not receive(:valid?)
      extension.incoming(message, ->(_) {});
    end
  end

end
