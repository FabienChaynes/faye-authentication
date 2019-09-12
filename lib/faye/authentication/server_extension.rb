require 'faye'

module Faye
  module Authentication
    class ServerExtension
      include Faye::Logging

      def initialize(secret, options = {})
        @options = options
        @secret = secret.to_s
      end

      def incoming(message, callback)
        if Faye::Authentication.authentication_required?(message, @options)
          begin
            Faye::Authentication.validate(message['signature'],
                                          message['subscription'] || message['channel'],
                                          message['clientId'],
                                          @secret)
            debug("Authentication sucessful")
          rescue AuthError => exception
            message['error'] = case exception
              when ExpiredError then 'Expired signature'
              when PayloadError then 'Required argument not signed'
              else 'Invalid signature'
              end
            debug("Authentication failed: #{message['error']}")
          end
          message.delete('signature')
        end
        callback.call(message)
      end
    end
  end
end
