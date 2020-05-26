require 'jwt'
require 'faye/mixins/logging'
require 'faye/authentication/version'
require 'faye/authentication/server_extension'
require 'faye/authentication/client_extension'
require 'faye/authentication/http_client'
require 'faye/authentication/engine'

module Faye
  module Authentication

    extend Faye::Logging

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
      payload, _ = JWT.decode(signature, secret)
      payload
    rescue JWT::ExpiredSignature
      raise ExpiredError
    rescue
      raise AuthError
    end

    # Return true if signature is valid and correspond to channel and clientId or raise
    def self.validate(signature, channel, clientId, secret)
      payload = self.decode(signature, secret)
      raise PayloadError if channel.to_s.empty? || clientId.to_s.empty?
      raise PayloadError unless channel == payload['channel'] && clientId == payload['clientId']
      true
    end

    def self.authentication_required?(message, options = {})
      subscription_or_channel = message['subscription'] || message['channel']
      return false if message['channel'].nil?
      return false unless (message['channel'].start_with?('/meta/subscribe') || (!(message['channel'].start_with?('/meta/'))))
      whitelist_proc = options[:whitelist]
      if whitelist_proc
        begin
          return !whitelist_proc.call(subscription_or_channel)
        rescue => e
          error("Error caught when evaluating whitelist lambda : #{e.message}")
        end
      end
      true
    end

  end
end
