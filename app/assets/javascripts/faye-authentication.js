function FayeAuthentication(endpoint) {
  this._endpoint = endpoint || '/faye/auth';
  this._signatures = {};
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.signMessage = function(message, callback) {
  var channel = message.subscription || message.channel;
  var clientId = message.clientId;

  if (!this._signatures[clientId])
    this._signatures[clientId] = {};
  if (this._signatures[clientId][channel]) {
    this._signatures[clientId][channel].then(function(signature) {
      message.signature = signature;
      callback(message);
    });
  } else {
    var self = this;
    self._signatures[clientId][channel] = new Faye.Promise(function(success, failure) {
      $.post(self.endpoint(), {message: {channel: channel, clientId: clientId}}, function(response) {
        success(response.signature);
      }, 'json').fail(function(xhr, textStatus, e) {
        success(null);
      });
    });
    self._signatures[clientId][channel].then(function(signature) {
      message.signature = signature;
      callback(message);
    });
  }
}

FayeAuthentication.prototype.outgoing = function(message, callback) {
  if (message.channel == '/meta/subscribe') {
    this.signMessage(message, callback);
  }
  else if (!/^\/meta\/(.*)/.test(message.channel)) { // Publish
    this.signMessage(message, callback);
  }
  else
    callback(message);
};

FayeAuthentication.prototype.incoming = function(message, callback) {
  if (message.error == 'Invalid signature')
    this._signatures = {};
  callback(message);
};
