require 'faye/authentication'

module Faye
  module Authentication
    class Extension

      def initialize(secret)
        @secret = secret
      end

      def incoming(message, callback)
        channel = message['channel']
        if channel == '/meta/subscribe' || !(channel =~ /^\/meta\/.*/)
          unless Faye::Authentication::valid?(message, @secret)
            message['error'] = 'Invalid signature'
          end
        end
        callback.call(message)
      end

    end
  end
end
