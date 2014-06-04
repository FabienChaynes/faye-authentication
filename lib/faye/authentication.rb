require 'jwt'
require 'faye/authentication/version'
require 'faye/authentication/extension'
require 'faye/authentication/http_client'
require 'faye/authentication/engine'

module Faye
  module Authentication
    class AuthError < StandardError; end
    class ExpiredError < AuthError; end
    class PayloadError < AuthError; end

    # Return jwt signature, pass hash of payload including channel and client_id 
    def self.sign(payload, secret, expire_at: Time.now + 12*3600, algorithm: 'HS256')
      JWT.encode(payload.merge(exp: expire_at.to_i), secret, algorithm)
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
  end
end
