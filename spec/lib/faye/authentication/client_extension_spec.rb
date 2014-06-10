require 'spec_helper'
require 'rspec/em'
require 'faye/authentication'

ClientSteps = RSpec::EM.async_steps do
  def client(name, channels, enable_extension = false, &callback)
    @clients ||= {}
    @inboxes ||= {}
    @errors ||= {}
    @clients[name] = Faye::Client.new('http://127.0.0.1:9876/faye')
    @clients[name].add_extension(Faye::Authentication::ClientExtension.new('macaroni')) if enable_extension
    @inboxes[name] = {}
    @errors[name] ||= []

    n = channels.size
    return @clients[name].connect(&callback) if n.zero?

    channels.each do |channel|
      subscription = @clients[name].subscribe(channel) do |message|
        @inboxes[name][channel] ||= []
        @inboxes[name][channel] << message
      end
      subscription.errback do |e|
        n -= 1
        @errors[name] << e.message
        callback.call if n.zero?
      end
      subscription.callback do
        n -= 1
        callback.call if n.zero?
      end
    end
  end

  def publish(name, channel, message, &callback)
    @clients[name].publish(channel, message)
    EM.add_timer(0.1, &callback)
  end

  def check_inbox(name, channel, messages, &callback)
    inbox = @inboxes[name][channel] || []
    expect(inbox).to eq(messages)
    callback.call
  end

  def check_errors(name, errors, &callback)
    expect(@errors[name]).to eq(errors)
    callback.call
  end

  def launch_server(&callback)
      Faye::WebSocket.load_adapter('thin')
      app = Faye::RackAdapter.new(:mount => '/faye', :timeout => 25)
      app.add_extension(Faye::Authentication::ServerExtension.new('macaroni'))
      Thin::Logging.silent = true
      Thin::Server.start('127.0.0.1', 9876, app)
      callback.call
  end
end

describe Faye::Authentication::ClientExtension do

  include ClientSteps

  before(:each) { launch_server }

  context 'without extension' do

    before(:each) do
      client 'foo', ['/foo']
    end

    it 'fails to deliver the message' do
      check_inbox 'foo', '/foo', []
      check_errors 'foo', ['Invalid signature']
    end

  end

  context 'with extension' do

    before(:each) do
      client 'foo', ['/foo'], true
      client 'bar', ['/foo'], true
    end

    it 'succeeds to deliver the message' do
      publish 'foo', '/foo', 'Hello'
      check_inbox 'foo', '/foo', ['Hello']
      check_errors 'foo', []
    end

  end

end
