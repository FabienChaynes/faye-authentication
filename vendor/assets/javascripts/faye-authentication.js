function FayeAuthentication(endpoint) {
  this._endpoint = endpoint || '/faye/auth';
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.outgoing = function(message, callback) {
  if (message.channel == '/meta/subscribe') {
    $.post(this.endpoint(), message, function(response) {
      message.signature = response.signature;
      callback(message);
    });
  }
  else
    callback(message);
};

FayeAuthentication.prototype.incoming = function(message, callback) {
  callback(message);
};
