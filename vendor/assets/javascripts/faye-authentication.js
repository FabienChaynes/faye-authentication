function FayeAuthentication(endpoint) {
  this._endpoint = endpoint || '/faye/auth';
  this._signatures = {};
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.getSignatureFor = function(message, callback) {
  var channel = message.channel;
  var clientId = message.clientId;

  if (!this._signatures[clientId])
    this._signatures[clientId] = {};
  if (this._signatures[clientId][channel])
    callback(this._signatures[clientId][channel]);
  else {
    var self = this;
    $.post(this.endpoint(), {channel: channel, clientId: clientId}, function(response) {
      self._signatures[clientId][channel] = response.signature;
      callback(response.signature);
    }, 'json').fail(function(xhr, textStatus, e) {
      callback(null, textStatus);
    });
  }
}

FayeAuthentication.prototype.outgoing = function(message, callback) {
  if (message.channel === '/meta/subscribe') {
    var self = this;
    this.getSignatureFor(message, function(signature, error) {
      if (signature !== null) {
        message.signature = signature;
        callback(message);
      }
      else {
        message.error = error;
        callback(message);
      }
    });
  }
  else
    callback(message);
};
