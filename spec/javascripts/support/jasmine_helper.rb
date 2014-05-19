#Use this file to set/override Jasmine configuration options
#You can remove it if you don't need it.
#This file is loaded *after* jasmine.yml is interpreted.
#
#Example: using a different boot file.
#Jasmine.configure do |config|
#   config.boot_dir = '/absolute/path/to/boot_dir'
#   config.boot_files = lambda { ['/absolute/path/to/boot_dir/file.js'] }
#end
#

require 'faye'
require 'rack'

# Start faye web server.
fork do
    Faye::WebSocket.load_adapter('thin')
   Rack::Handler::Thin.run Faye::RackAdapter.new(:mount => '/faye'), :Port => 9296
end.tap do |id|
  parent = $$
  at_exit {
    Process.kill("KILL", id) if $$ == parent # Only if the parent process exits
  }
end
