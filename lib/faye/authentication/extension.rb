module Faye
  module Authentication
    class Extension
      include Faye::Logging

      def initialize(secret)
        @secret = secret.to_s
      end

      def incoming(message, callback)
        if message['channel'] == '/meta/subscribe' || !(message['channel'] =~ /^\/meta\/.*/)
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
        end
        callback.call(message)
      end
    end
  end
end
