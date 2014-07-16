function FayeAuthentication(client, endpoint, options) {
  this._client = client;
  this._endpoint = endpoint || '/faye/auth';
  this._signatures = {};
  this._outbox = {};
  this._options = options || {};
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
  if (this.authentication_required(message))
    this.signMessage(message, callback);
  else
    callback(message);
};

FayeAuthentication.prototype.authentication_required = function(message) {
  var subscription_or_channel = message.subscription || message.channel;
  if (message.channel == '/meta/subscribe' || message.channel.lastIndexOf('/meta/', 0) !== 0)
    if(this._options.whitelist) {
      try {
        return (!this._options.whitelist(subscription_or_channel));
      } catch (e) {
        this.error("Error caught when evaluating whitelist function : " + e.message);
      }
    } else
      return (true);
  else
    return (false);
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

$(function() {
  Faye.extend(FayeAuthentication.prototype, Faye.Logging);
});
