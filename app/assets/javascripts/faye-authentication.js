function FayeAuthentication(client, endpoint) {
  this._client = client;
  this._endpoint = endpoint || '/faye/auth';
  this._signatures = {};
  this._outbox = {};
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.signMessage = function(message, callback) {
  var channel = message.subscription || message.channel;
  var clientId = message.clientId;

  var self = this;
  if (!this._signatures[clientId])
    this._signatures[clientId] = {};
  if (this._signatures[clientId][channel]) {
    this._signatures[clientId][channel].then(function(signature) {
      message.signature = signature;
      if (!message.retried)
        self._outbox[message.id] = {message: message, clientId: clientId};
      callback(message);
    });
  } else {
    self._signatures[clientId][channel] = new Faye.Promise(function(success, failure) {
      $.post(self.endpoint(), {message: {channel: channel, clientId: clientId}}, function(response) {
        success(response.signature);
      }, 'json').fail(function(xhr, textStatus, e) {
        success(null);
      });
    });
    self._signatures[clientId][channel].then(function(signature) {
      message.signature = signature;
      if (!message.retried){
        self._outbox[message.id] = {message: message, clientId: clientId};
      }
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
  var outbox_message = this._outbox[message.id];
  if (outbox_message && message.error) {
    var channel = outbox_message.message.subscription || outbox_message.message.channel;
    this._signatures[outbox_message.clientId][channel] = null;
    outbox_message.message.retried = true;
    delete outbox_message.message.id;
    delete this._outbox[message.id];
    this._client._send(outbox_message.message, callback);
  }
  else
    callback(message);
};
