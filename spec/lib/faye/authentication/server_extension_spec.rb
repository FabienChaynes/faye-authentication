require 'spec_helper'
require 'faye/authentication'

describe Faye::Authentication::ServerExtension do

  let(:secret) { 'macaroni' }
  let(:extension) { Faye::Authentication::ServerExtension.new(secret) }
  let(:channel) { '/channel' }

  describe '#incoming' do
    shared_examples 'signature_has_error' do
      it 'adds an error' do
        subject
        expect(@result).to have_key('error')
      end
    end

    shared_examples 'signature_has_no_error' do
      it 'adds no error' do
        subject
        expect(@result).to_not have_key('error')
      end
    end

    shared_examples 'authentication_actions' do
      context 'does not require signature' do
        before { expect(Faye::Authentication).to receive(:authentication_required?).with(message, {}).and_return(false) }
        it_should_behave_like 'signature_has_no_error'
      end

      context 'requires signature' do
        before { expect(Faye::Authentication).to receive(:authentication_required?).with(message, {}).and_return(true) }
        context 'with signature' do
          before { message['signature'] = Faye::Authentication.sign(message.merge({'channel' => channel}), secret) }
          it_should_behave_like 'signature_has_no_error'

          it 'removes the signature in the response' do
            subject
            expect(@result).not_to have_key('signature')
          end
        end

        context 'without signature' do
          it_should_behave_like 'signature_has_error'
        end
      end
    end

    let(:message) { {'channel' => channel, 'clientId' => '42', 'text' => 'whatever'} }
    subject do
      extension.incoming(message, ->(m) { @result = m });
    end

    context 'publish' do
      it_should_behave_like 'authentication_actions'
    end

    context 'subscribe' do
      before { message['channel'] = '/meta/subscribe'}
      before { message['subscription'] = channel}
      it_should_behave_like 'authentication_actions'
    end
  end

  ['/meta/handshake', '/meta/connect', '/meta/unsubscribe', '/meta/disconnect'].each do |channel|
    it "does not check the signature for #{channel}" do
      message = {'channel' => channel, 'clientId' => '42', 'text' => 'whatever', 'signature' => 'hello'}
      expect(Faye::Authentication).to_not receive(:validate)
      extension.incoming(message, ->(_) {});
    end
  end

end
