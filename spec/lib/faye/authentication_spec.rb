require 'spec_helper'
require 'faye/authentication'

describe Faye::Authentication do

  let(:secret) { 'helloworld' }

  describe '#valid?' do
    it 'returns true if the message is correctly signed' do
      message = {'channel' => '/foo/bar', 'clientId' => '42', 'text' => 'whatever'}
      signature = Faye::Authentication.sign(message, secret)
      message['signature'] = signature
      expect(Faye::Authentication.valid?(message, secret)).to be(true)
    end

    it 'returns false if the message if keys differ' do
      message = {'channel' => '/foo/bar', 'clientId' => '42', 'text' => 'whatever'}
      signature = Faye::Authentication.sign(message, secret)
      message['signature'] = signature
      expect(Faye::Authentication.valid?(message, secret + 'foo')).to be(false)
    end
  end

end
