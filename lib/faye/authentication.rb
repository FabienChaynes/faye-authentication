require "faye/authentication/version"
require 'faye/authentication/extension'
require 'faye/authentication/http_client'
require 'faye/authentication/engine'

module Faye
  module Authentication

    def self.sign(message, secret)
      OpenSSL::HMAC.hexdigest('sha1', secret, "#{message['channel']}-#{message['clientId']}")
    end

    def self.valid?(message, secret)
      signature = message.delete('signature')
      return false unless signature
      secure_compare(signature, sign(message, secret))
    end

    # constant-time comparison algorithm to prevent timing attacks
    # Copied from ActiveSupport::MessageVerifier
    def self.secure_compare(a, b)
      return false unless a.bytesize == b.bytesize

      l = a.unpack "C#{a.bytesize}"

      res = 0
      b.each_byte { |byte| res |= byte ^ l.shift }
      res == 0
    end

  end
end
