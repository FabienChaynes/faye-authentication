function FayeAuthentication(endpoint) {
  this._endpoint = endpoint || '/faye/auth';
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.outgoing = function(message, callback) {
  if (message.channel === '/meta/subscribe') {
    $.post(this.endpoint(), message, function(response) {
      message.signature = response.signature;
      callback(message);
    }, 'json').fail(function(xhr, textStatus, e) {
      message.error = textStatus;
      callback(message);
    });
  }
  else
    callback(message);
};
