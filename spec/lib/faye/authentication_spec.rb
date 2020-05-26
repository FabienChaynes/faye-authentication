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

  describe '#authentication_required?' do

    before(:each) { Faye.logger = nil }

    shared_examples 'subscribe_and_publish' do
      it 'returns true if no options are passed' do
        expect(Faye::Authentication.authentication_required?(message)).to be(true)
      end

      it 'returns true if empty options are passed' do
        expect(Faye::Authentication.authentication_required?(message, {})).to be(true)
      end

      it 'returns true if not a lamda / proc' do
        expect(Faye::Authentication.authentication_required?(message, {whitelist: 42})).to be(true)
      end

      it 'calls the lambda with the channel or subscription' do
        block = double
        expect(block).to receive(:call).with(message['subscription'] || message['channel'])
        Faye::Authentication.authentication_required?(message, {whitelist: block})
      end

      it 'returns true if lambda raises' do
        expect(Faye::Authentication.authentication_required?(message, {whitelist: lambda { |message| raise "oops" }})).to be(true)
      end

      it 'logs the error if lambda raises' do
        Faye.logger = double()
        expect(Faye.logger).to receive(:error).with("[Module] Error caught when evaluating whitelist lambda : oops")
        Faye::Authentication.authentication_required?(message, {whitelist: lambda { |message| raise "oops" }})
      end

      it 'returns true if lambda returns false' do
        expect(Faye::Authentication.authentication_required?(message, {whitelist: lambda { |message| false }})).to be(true)
      end

      it 'returns false if lambda returns true' do
        expect(Faye::Authentication.authentication_required?(message, {whitelist: lambda { |message| true }})).to be(false)
      end

      it 'returns false if channel is nil' do
        expect(Faye::Authentication.authentication_required?('clientId' => clientId, 'text' => 'whatever')).to be(false)
      end
    end

    shared_examples 'meta_except_subscribe' do
      it 'returns false if no options are passed' do
        expect(Faye::Authentication.authentication_required?(message)).to be(false)
      end

      it 'returns false if empty options are passed' do
        expect(Faye::Authentication.authentication_required?(message, {})).to be(false)
      end

      it 'returns false even if lambda returns false' do
        expect(Faye::Authentication.authentication_required?(message, {whitelist: lambda { |message| false }})).to be(false)
      end

      it 'does not call lambda / proc' do
        not_called = double()
        expect(not_called).to_not receive(:call)
        (Faye::Authentication.authentication_required?(message, {whitelist: not_called}))
      end

    end

    context 'publish' do
      let(:message) { {'channel' => '/foobar'} }
      it_behaves_like 'subscribe_and_publish'
    end

    context 'subscribe' do
      let(:message) { {'channel' => '/meta/subscribe', 'subscription' => '/foobar'} }
      it_behaves_like 'subscribe_and_publish'
    end

    context 'subscribe with prefix' do
      let(:message) { {'channel' => '/meta/subscribe/x', 'subscription' => '/foobar'} }
      it_behaves_like 'subscribe_and_publish'
    end

    context 'handshake' do
      let(:message) { {'channel' => '/meta/handshake'} }
      it_behaves_like 'meta_except_subscribe'
    end

    context 'connect' do
      let(:message) { {'channel' => '/meta/connect'} }
      it_behaves_like 'meta_except_subscribe'
    end

    context 'unsubscribe' do
      let(:message) { {'channel' => '/meta/unsubscribe', 'subscription' => '/foobar'} }
      it_behaves_like 'meta_except_subscribe'
    end

  end

end
