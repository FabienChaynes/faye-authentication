require 'jwt'
require 'faye/authentication/version'
require 'faye/authentication/server_extension'
require 'faye/authentication/client_extension'
require 'faye/authentication/http_client'
require 'faye/authentication/engine'

module Faye
  module Authentication
    class AuthError < StandardError; end
    class ExpiredError < AuthError; end
    class PayloadError < AuthError; end

    # Return jwt signature, pass hash of payload including channel and client_id
    def self.sign(payload, secret, options = {})
      options = {expires_at: Time.now + 12*3600, algorithm: 'HS256'}.merge(options)
      JWT.encode(payload.merge(exp: options[:expires_at].to_i), secret, options[:algorithm])
    end

    # Return signed payload or raise
    def self.decode(signature, secret)
      payload, _ = JWT.decode(signature, secret) rescue raise(AuthError)
      raise ExpiredError if Time.at(payload['exp'].to_i) < Time.now
      payload
    end

    # Return true if signature is valid and correspond to channel and clientId or raise
    def self.validate(signature, channel, clientId, secret)
      payload = self.decode(signature, secret)
      raise PayloadError if channel.to_s.empty? || clientId.to_s.empty?
      raise PayloadError unless channel == payload['channel'] && clientId == payload['clientId']
      true
    end

    def self.authentication_required?(message)
      subscription_or_channel = message['subscription'] || message['channel']
      !public_channel?(subscription_or_channel) && (message['channel'] == '/meta/subscribe' || (!(message['channel'] =~ /^\/meta\/.*/)))
    end

    def self.public_channel?(channel)
      if channel.start_with?('/public/')
        unless channel.include?('*')
          return true
        end
      end
      false
    end

  end
end
