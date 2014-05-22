require 'spec_helper'
require 'faye/authentication'

describe Faye::Authentication::HTTPClient do

  describe '.publish' do

    it 'should publish a HTTP request with correct params' do
      message = {'channel' => '/foo/bar', 'data' => 'hello', 'clientId' => 'http'}
      message['signature'] = Faye::Authentication.sign(message, 'my private key')
      request = stub_request(:post, "http://www.example.com").with(:body => {:message => JSON.dump(message)}).to_return(:status => 200, :body => "", :headers => {})
      Faye::Authentication::HTTPClient.publish('http://www.example.com', '/foo/bar', "hello", 'my private key')
      expect(request).to have_been_made
    end

  end

end
