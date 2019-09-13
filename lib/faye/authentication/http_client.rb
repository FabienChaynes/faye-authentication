require 'json'

module Faye
  module Authentication
    class HTTPClient

      def self.publish(url, channel, data, key, options = {})
        uri = URI(url)
        req = prepare_request(uri.request_uri, channel, data, key, options)
        Net::HTTP.start(uri.hostname, uri.port, :use_ssl => uri.scheme == 'https') { |http| http.request(req) }
      end

      def self.prepare_request(uri, channel, data, key, options = {})
        req = Net::HTTP::Post.new(uri)
        message = {'channel' => channel, 'clientId' => 'http'}
        message['signature'] = Faye::Authentication.sign(message, key) if Faye::Authentication.authentication_required?(message, options)
        message['data'] = data
        req.set_form_data(message: JSON.dump(message))
        req
      end

    end
  end
end
