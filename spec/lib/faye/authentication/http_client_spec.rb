require 'spec_helper'
require 'faye/authentication'

describe Faye::Authentication::HTTPClient do

  describe '.publish' do

    it 'should publish a HTTP request with correct params' do
      message = {'channel' => '/foo/bar', 'clientId' => 'http'}
      message['signature'] = Faye::Authentication.sign(message, 'my private key')
      message['data'] = 'hello'
      request = stub_request(:post, "http://www.example.com").with(body: {message: JSON.dump(message)}).to_return(status: 200, body: "", headers: {})
      Faye::Authentication::HTTPClient.publish('http://www.example.com', '/foo/bar', "hello", 'my private key')
      expect(request).to have_been_made
    end

    it 'should not add a signature if the channel is whitelisted' do
      message = {'channel' => '/foo/bar', 'clientId' => 'http'}
      message['data'] = 'hello'
      request = stub_request(:post, "http://www.example.com").with(body: {message: JSON.dump(message)}).to_return(status: 200, body: "", headers: {})
      whitelist = lambda do |channel|
        channel.start_with?('/foo/')
      end
      Faye::Authentication::HTTPClient.publish('http://www.example.com', '/foo/bar', "hello", 'my private key', { whitelist: whitelist })
      expect(request).to have_been_made
    end

  end

end
