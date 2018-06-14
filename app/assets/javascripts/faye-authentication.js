function FayeAuthentication(client, endpoint, options) {
  this._client = client;
  this._endpoint = endpoint || '/faye/auth';
  this._signatures = {};
  this._outbox = {};
  this._options = options || {};
  this._options.retry_delay = this._options.retry_delay || 1000;
  this._waiting_signatures = [];
  this._timer = null;
  this.logger = {
    error: function(message) {
      // NOOP
    }
  }
}

FayeAuthentication.prototype.endpoint = function() {
  return (this._endpoint);
};

FayeAuthentication.prototype.resolveWaitingSignatures = function() {
  if (this._waiting_signatures.length == 0) {
    return ;
  }
  var self = this;
  var messages = [];
  $.each(this._waiting_signatures, function(key, params) {
    messages.push(params);
  });
  this._waiting_signatures = [];
  messages = messages.sort(function(a, b) {
    return (a.channel > b.channel);
  });

  $.post(self.endpoint(), {messages: messages}, function(response) {
    $.each(messages, function(key, params) {
      var signature = $.grep(response.signatures || [], function(e) {
        return (e.channel == params.channel && e.clientId == params.clientId);
      })[0];
      if (typeof signature === 'undefined') {
        self.logger.error('No signature found in ajax reply for channel ' + params.channel + ' and clientId ' + params.clientId);
      } else if (signature && !signature.signature) {
        self.logger.error('Error when fetching signature for channel ' + params.channel + ' and clientId ' + params.clientId + ', error was : "' + signature.error + '"');
      }
      FayeAuthentication.Promise.resolve(self._signatures[params.clientId][params.channel], signature ? signature.signature : null);
    });
  }, 'json').fail(function(xhr, textStatus, e) {
    self.logger.error('Failure when trying to fetch JWT signature for data "' + JSON.stringify(messages) + '", error was : ' + textStatus);
    $.each(messages, function(key, params) {
      FayeAuthentication.Promise.resolve(self._signatures[params.clientId][params.channel], null);
    });
  });
};

FayeAuthentication.prototype.signMessage = function(message, callback) {
  var channel = message.subscription || message.channel;
  var clientId = message.clientId;

  var self = this;
  if (!this._signatures[clientId]) {
    this._signatures[clientId] = {};
  }
  if (this._signatures[clientId][channel]) {
    this._signatures[clientId][channel].then(function(signature) {
      message.signature = signature;
      if (!message.retried) {
        self._outbox[message.id] = {message: message, clientId: clientId};
      }
      callback(message);
    });
  } else {
    var promise = self._signatures[clientId][channel] = new FayeAuthentication.Promise();
    promise.then(function(signature) {
      message.signature = signature;
      if (!message.retried) {
        self._outbox[message.id] = {message: message, clientId: clientId};
      }
      callback(message);
    });
    this._waiting_signatures.push({channel: channel, clientId: clientId});
    clearTimeout(this._timer);
    this._timer = setTimeout(function() {
      self.resolveWaitingSignatures();
    }, 200);
  }
}

FayeAuthentication.prototype.outgoing = function(message, callback) {
  if (this.authentication_required(message)) {
    this.signMessage(message, callback);
  } else {
    callback(message);
  }
};

FayeAuthentication.prototype.authentication_required = function(message) {
  var subscription_or_channel = message.subscription || message.channel;
  if (message.channel == '/meta/subscribe' || message.channel.lastIndexOf('/meta/', 0) !== 0) {
    if(this._options.whitelist) {
      try {
        return (!this._options.whitelist(subscription_or_channel));
      } catch (e) {
        this.logger.error("Error caught when evaluating whitelist function : " + e.message);
      }
    }
    return (true);
  }
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
    var self = this;
    setTimeout(function() {
      self._client._sendMessage(outbox_message.message, {}, callback);
    }, this._options.retry_delay);
  } else {
    callback(message);
  }
};

(function() {
'use strict';

var timeout = setTimeout, defer;

if (typeof setImmediate === 'function')
  defer = function(fn) { setImmediate(fn) };
else if (typeof process === 'object' && process.nextTick)
  defer = function(fn) { process.nextTick(fn) };
else
  defer = function(fn) { timeout(fn, 0) };

var PENDING   = 0,
    FULFILLED = 1,
    REJECTED  = 2;

var RETURN = function(x) { return x },
    THROW  = function(x) { throw  x };

var Promise = function(task) {
  this._state       = PENDING;
  this._onFulfilled = [];
  this._onRejected  = [];

  if (typeof task !== 'function') return;
  var self = this;

  task(function(value)  { fulfill(self, value) },
       function(reason) { reject(self, reason) });
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  var next = new Promise();
  registerOnFulfilled(this, onFulfilled, next);
  registerOnRejected(this, onRejected, next);
  return next;
};

var registerOnFulfilled = function(promise, onFulfilled, next) {
  if (typeof onFulfilled !== 'function') onFulfilled = RETURN;
  var handler = function(value) { invoke(onFulfilled, value, next) };

  if (promise._state === PENDING) {
    promise._onFulfilled.push(handler);
  } else if (promise._state === FULFILLED) {
    handler(promise._value);
  }
};

var registerOnRejected = function(promise, onRejected, next) {
  if (typeof onRejected !== 'function') onRejected = THROW;
  var handler = function(reason) { invoke(onRejected, reason, next) };

  if (promise._state === PENDING) {
    promise._onRejected.push(handler);
  } else if (promise._state === REJECTED) {
    handler(promise._reason);
  }
};

var invoke = function(fn, value, next) {
  defer(function() { _invoke(fn, value, next) });
};

var _invoke = function(fn, value, next) {
  var outcome;

  try {
    outcome = fn(value);
  } catch (error) {
    return reject(next, error);
  }

  if (outcome === next) {
    reject(next, new TypeError('Recursive promise chain detected'));
  } else {
    fulfill(next, outcome);
  }
};

var fulfill = Promise.fulfill = Promise.resolve = function(promise, value) {
  var called = false, type, then;

  try {
    type = typeof value;
    then = value !== null && (type === 'function' || type === 'object') && value.then;

    if (typeof then !== 'function') return _fulfill(promise, value);

    then.call(value, function(v) {
      if (!(called ^ (called = true))) return;
      fulfill(promise, v);
    }, function(r) {
      if (!(called ^ (called = true))) return;
      reject(promise, r);
    });
  } catch (error) {
    if (!(called ^ (called = true))) return;
    reject(promise, error);
  }
};

var _fulfill = function(promise, value) {
  if (promise._state !== PENDING) return;

  promise._state      = FULFILLED;
  promise._value      = value;
  promise._onRejected = [];

  var onFulfilled = promise._onFulfilled, fn;
  while (fn = onFulfilled.shift()) fn(value);
};

var reject = Promise.reject = function(promise, reason) {
  if (promise._state !== PENDING) return;

  promise._state       = REJECTED;
  promise._reason      = reason;
  promise._onFulfilled = [];

  var onRejected = promise._onRejected, fn;
  while (fn = onRejected.shift()) fn(reason);
};

Promise.all = function(promises) {
  return new Promise(function(fulfill, reject) {
    var list = [],
         n   = promises.length,
         i;

    if (n === 0) return fulfill(list);

    for (i = 0; i < n; i++) (function(promise, i) {
      Promise.fulfilled(promise).then(function(value) {
        list[i] = value;
        if (--n === 0) fulfill(list);
      }, reject);
    })(promises[i], i);
  });
};

Promise.defer = defer;

Promise.deferred = Promise.pending = function() {
  var tuple = {};

  tuple.promise = new Promise(function(fulfill, reject) {
    tuple.fulfill = tuple.resolve = fulfill;
    tuple.reject  = reject;
  });
  return tuple;
};

Promise.fulfilled = Promise.resolved = function(value) {
  return new Promise(function(fulfill, reject) { fulfill(value) });
};

Promise.rejected = function(reason) {
  return new Promise(function(fulfill, reject) { reject(reason) });
};

FayeAuthentication.Promise = Promise;

})();

(function() {
'use strict';

var timeout = setTimeout, defer;

if (typeof setImmediate === 'function')
  defer = function(fn) { setImmediate(fn) };
else if (typeof process === 'object' && process.nextTick)
  defer = function(fn) { process.nextTick(fn) };
else
  defer = function(fn) { timeout(fn, 0) };

var PENDING   = 0,
    FULFILLED = 1,
    REJECTED  = 2;

var RETURN = function(x) { return x },
    THROW  = function(x) { throw  x };

var Promise = function(task) {
  this._state       = PENDING;
  this._onFulfilled = [];
  this._onRejected  = [];

  if (typeof task !== 'function') return;
  var self = this;

  task(function(value)  { fulfill(self, value) },
       function(reason) { reject(self, reason) });
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  var next = new Promise();
  registerOnFulfilled(this, onFulfilled, next);
  registerOnRejected(this, onRejected, next);
  return next;
};

var registerOnFulfilled = function(promise, onFulfilled, next) {
  if (typeof onFulfilled !== 'function') onFulfilled = RETURN;
  var handler = function(value) { invoke(onFulfilled, value, next) };

  if (promise._state === PENDING) {
    promise._onFulfilled.push(handler);
  } else if (promise._state === FULFILLED) {
    handler(promise._value);
  }
};

var registerOnRejected = function(promise, onRejected, next) {
  if (typeof onRejected !== 'function') onRejected = THROW;
  var handler = function(reason) { invoke(onRejected, reason, next) };

  if (promise._state === PENDING) {
    promise._onRejected.push(handler);
  } else if (promise._state === REJECTED) {
    handler(promise._reason);
  }
};

var invoke = function(fn, value, next) {
  defer(function() { _invoke(fn, value, next) });
};

var _invoke = function(fn, value, next) {
  var outcome;

  try {
    outcome = fn(value);
  } catch (error) {
    return reject(next, error);
  }

  if (outcome === next) {
    reject(next, new TypeError('Recursive promise chain detected'));
  } else {
    fulfill(next, outcome);
  }
};

var fulfill = Promise.fulfill = Promise.resolve = function(promise, value) {
  var called = false, type, then;

  try {
    type = typeof value;
    then = value !== null && (type === 'function' || type === 'object') && value.then;

    if (typeof then !== 'function') return _fulfill(promise, value);

    then.call(value, function(v) {
      if (!(called ^ (called = true))) return;
      fulfill(promise, v);
    }, function(r) {
      if (!(called ^ (called = true))) return;
      reject(promise, r);
    });
  } catch (error) {
    if (!(called ^ (called = true))) return;
    reject(promise, error);
  }
};

var _fulfill = function(promise, value) {
  if (promise._state !== PENDING) return;

  promise._state      = FULFILLED;
  promise._value      = value;
  promise._onRejected = [];

  var onFulfilled = promise._onFulfilled, fn;
  while (fn = onFulfilled.shift()) fn(value);
};

var reject = Promise.reject = function(promise, reason) {
  if (promise._state !== PENDING) return;

  promise._state       = REJECTED;
  promise._reason      = reason;
  promise._onFulfilled = [];

  var onRejected = promise._onRejected, fn;
  while (fn = onRejected.shift()) fn(reason);
};

Promise.all = function(promises) {
  return new Promise(function(fulfill, reject) {
    var list = [],
         n   = promises.length,
         i;

    if (n === 0) return fulfill(list);

    for (i = 0; i < n; i++) (function(promise, i) {
      Promise.fulfilled(promise).then(function(value) {
        list[i] = value;
        if (--n === 0) fulfill(list);
      }, reject);
    })(promises[i], i);
  });
};

Promise.defer = defer;

Promise.deferred = Promise.pending = function() {
  var tuple = {};

  tuple.promise = new Promise(function(fulfill, reject) {
    tuple.fulfill = tuple.resolve = fulfill;
    tuple.reject  = reject;
  });
  return tuple;
};

Promise.fulfilled = Promise.resolved = function(value) {
  return new Promise(function(fulfill, reject) { fulfill(value) });
};

Promise.rejected = function(reason) {
  return new Promise(function(fulfill, reject) { reject(reason) });
};

FayeAuthentication.Promise = Promise;

})();
