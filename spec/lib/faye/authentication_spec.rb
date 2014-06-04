require 'spec_helper'
require 'faye/authentication'

describe Faye::Authentication do

  let(:channel) { '/foo/bar' }
  let(:clientId) { '42' }
  let(:message) { {'channel' => channel, 'clientId' => clientId, 'text' => 'whatever'} }
  let(:secret) { 'helloworld' }
  let(:signature) { Faye::Authentication.sign(message, secret) }
 
  describe '#sign' do
    it 'returns with a default expiry'
  end

  describe '#decode' do
    it 'returns the payload if the message is correctly signed' do
      expect(Faye::Authentication.decode(signature, secret)).to include(message)
    end

    it 'raises error if the message if keys differ' do
      expect { Faye::Authentication.decode(signature, secret + 'foo') }.to raise_error(Faye::Authentication::AuthError)
    end

    it 'raises error if the expiry is in the past' do
      signature = Faye::Authentication.sign(message, secret, expires_at: Time.now - 1)
      expect { Faye::Authentication.decode(signature, secret) }.to raise_error(Faye::Authentication::ExpiredError)
    end

    it 'return the payload if the expiry is in the future' do
      signature = Faye::Authentication.sign(message, secret, expires_at: Time.now + 10)
      expect { Faye::Authentication.decode(signature, secret) }.not_to raise_error
    end
  end

  describe '#validate' do
    it 'returns true if the message is correctly signed' do
      expect(Faye::Authentication.validate(signature, channel, clientId, secret)).to be(true)
    end

    it 'raises if the channel differs' do
      expect { Faye::Authentication.validate(signature, channel + '1', clientId, secret) }.to raise_error(Faye::Authentication::PayloadError)
    end

    it 'raises if the channel is not defined' do
      expect { Faye::Authentication.validate(signature, '', clientId, secret) }.to raise_error(Faye::Authentication::PayloadError)
    end

    it 'raises if the channel differs' do
      expect { Faye::Authentication.validate(signature, channel, clientId + '1', secret) }.to raise_error(Faye::Authentication::PayloadError)
    end

    it 'raises if the channel is not defined' do
      expect { Faye::Authentication.validate(signature, channel, nil, secret) }.to raise_error(Faye::Authentication::PayloadError)
    end
  end

end
