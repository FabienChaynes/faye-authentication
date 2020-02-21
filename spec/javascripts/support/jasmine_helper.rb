#Use this file to set/override Jasmine configuration options
#You can remove it if you don't need it.
#This file is loaded *after* jasmine.yml is interpreted.

Jasmine.configure do |config|
  config.runner_browser = :chromeheadless
end

require 'faye'
require 'faye/authentication'
require 'rack'

FAYE_SECRET_KEY = 'macaroni'

# Start faye web server.
fork do
    Faye::WebSocket.load_adapter('thin')
    faye = Faye::RackAdapter.new(:mount => '/faye')
    #require 'logger'
    #Faye.logger = Logger.new(STDOUT)
    faye.add_extension Faye::Authentication::ServerExtension.new(FAYE_SECRET_KEY)
   Rack::Handler::Thin.run faye, :Port => 9296
end.tap do |id|
  parent = $$
  at_exit {
    Process.kill("KILL", id) if $$ == parent # Only if the parent process exits
  }
end
