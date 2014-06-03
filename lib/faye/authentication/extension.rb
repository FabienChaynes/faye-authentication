module Faye
  module Authentication
    class Extension

      def initialize(secret)
        @secret = secret.to_s
      end

      def incoming(message, callback)
        if message['channel'] == '/meta/subscribe' || !(message['channel'] =~ /^\/meta\/.*/)
          unless Faye::Authentication.valid?({
            'channel'   => message['subscription'] || message['channel'],
            'clientId'  => message['clientId'],
            'signature' => message['signature']
            }, @secret)
            message['error'] = 'Invalid signature'
          end
        end
        callback.call(message)
      end

    end
  end
end
