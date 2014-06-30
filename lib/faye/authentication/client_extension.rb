module Faye
  module Authentication
    class ClientExtension

      def initialize(secret, options = {})
        @secret = secret
        @options = options
      end

      def outgoing(message, callback)
        if Faye::Authentication.authentication_required?(message)
          message['signature'] = Faye::Authentication.sign({channel: message['subscription'] || message['channel'], clientId: message['clientId']}, @secret, @options)
        end
        callback.call(message)
      end

    end
  end
end
