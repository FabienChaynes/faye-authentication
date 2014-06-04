require 'json'

module Faye
  module Authentication
    class HTTPClient

      def self.publish(url, channel, data, key)
        uri = URI(url)
        req = Net::HTTP::Post.new(url)
        message = {'channel' => channel, 'clientId' => 'http'} 
        message['signature'] = Faye::Authentication.sign(message, key)
        message['data'] = data
        req.set_form_data(message: JSON.dump(message))
        Net::HTTP.start(uri.hostname, uri.port, :use_ssl => uri.scheme == 'https') { |http| http.request(req) }
      end

    end
  end
end
