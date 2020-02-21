describe('Faye extension', function() {
  beforeEach(function() {
    Faye.logger = {error: function() {}};
    this.client = new Faye.Client('http://localhost:9296/faye');
    jasmine.Ajax.install();
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  describe('Without extension', function() {
    it('fails to subscribe', function(done) {
      this.client.subscribe('/foobar').then(undefined, function(e) {
        expect(e.message).toBe('Invalid signature')
        done();
      });
    });

    it('fails to publish', function(done) {
      this.client.publish('/foobar', {text: 'whatever'}).then(undefined, function(e) {
        expect(e.message).toBe('Invalid signature')
        done();
      });
    });
  });

  describe('With extension', function() {
    beforeEach(function() {
      this.extension = new FayeAuthentication(this.client, null, {retry_delay: 100});
      this.client.addExtension(this.extension);
    });

    function stubSignature(context, callback) {
      var self = context;
      self.client.handshake(function() {
        var jwtsign = new jwt.WebToken('{"clientId": "' + self.client._dispatcher.clientId + '", "channel": "/foobar", "exp": 2803694528}', '{"alg": "HS256"}');
        var signature = jwtsign.serialize("macaroni");

        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signatures": [{"channel" : "/foobar", "clientId": "'+ self.client._dispatcher.clientId +'", "signature" : "' + signature + '"}]}'
        });
        callback();
      }, self.client);
    }

    it('should make an ajax request to the extension endpoint', function(done) {
      this.client.subscribe('/foobar');
      var self = this;
      setTimeout(function() {
        var request = jasmine.Ajax.requests.mostRecent();
        expect(request.url).toBe(self.extension.endpoint());
        done();
      }, 500);
    });

    it('should make an ajax request with the correct params', function(done) {
      this.client.subscribe('/foobar');
      var self = this;
      setTimeout(function() {
        var request = jasmine.Ajax.requests.mostRecent();
        expect(request.data()['messages[0][channel]'][0]).toBe('/foobar');
        done();
      }, 500);
    });

    describe('signature', function() {

      beforeEach(function() {
        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signatures": [{"channel": "/foobar", "clientId": "1234", "signature": "foobarsignature"}]}'
        });

        this.dispatcher = {connectionType: "fake", clientId: '1234', sendMessage: function() {}, selectTransport: function() { }};
        spyOn(this.dispatcher, 'sendMessage');
        spyOn(this.dispatcher, 'selectTransport');
      });

      it('should add the signature to subscribe message', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._dispatcher = self.dispatcher;

          self.client.subscribe('/foobar');

          setTimeout(function() {
            var calls = self.dispatcher.sendMessage.calls.all();
            var last_call = calls[calls.length - 1];
            var message = last_call.args[0];
            expect(message.channel).toBe('/meta/subscribe');
            expect(message.signature).toBe('foobarsignature');
            done();
          }, 300);

        }, this.client);
      });

      it('should add the signature to publish message', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._dispatcher = self.dispatcher;
          self.client.publish('/foobar', {text: 'hallo'});

          setTimeout(function() {
            var calls = self.dispatcher.sendMessage.calls.all();
            var last_call = calls[calls.length - 1];
            var message = last_call.args[0];
            expect(message.channel).toBe('/foobar');
            expect(message.signature).toBe('foobarsignature');
            done();
          }, 300);

        }, this.client);
      });

      it('preserves messages integrity', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._dispatcher = self.dispatcher;
          self.client.publish('/foobar', {text: 'hallo'});
          self.client.subscribe('/foobar');

          setTimeout(function() {
            var calls = self.dispatcher.sendMessage.calls.all();
            var subscribe_call = calls[calls.length - 1];
            var publish_call = calls[calls.length - 2];
            var subscribe_message = subscribe_call.args[0];
            var publish_message = publish_call.args[0];
            expect(publish_message.channel).toBe('/foobar');
            expect(subscribe_message.channel).toBe('/meta/subscribe');
            expect(publish_message.signature).toBe('foobarsignature');
            expect(subscribe_message.signature).toBe('foobarsignature');
            done();
          }, 300);

        }, this.client);
      });

      it('does not add the signature if authentication is not required', function(done) {
        var self = this;

        spyOn(this.extension, 'authentication_required').and.returnValue(false);

        this.client.handshake(function() {
          self.client._dispatcher = self.dispatcher;
          self.client.publish('/foobar', {text: 'hallo'});

          setTimeout(function() {
            var calls = self.dispatcher.sendMessage.calls.all();
            var last_call = calls[calls.length - 1];
            var message = last_call.args[0];
            expect(message.channel).toBe('/foobar');
            expect(message.signature).toBe(undefined);
            done();
          }, 300);
        }, this.client);

      });

    });

    it('succeeds to subscribe', function(done) {
      var self = this;
      stubSignature(this, function() {
        self.client.subscribe('/foobar').then(function() {
          done();
        });
      });
    });

    it('succeeds to publish', function(done) {
      var self = this;
      stubSignature(this, function() {
        self.client.publish('/foobar', {hello: 'world'}).then(function() {
          done();
        });
      });
    });

    it('should make only one ajax call when dealing with one channel', function(done) {
      this.client.subscribe('/foobar');
      this.client.publish('/foobar', {text: 'hallo'});

      setTimeout(function() {
        expect(jasmine.Ajax.requests.count()).toBe(2); // Handshake + auth * 1
        done();
      }, 500);

    });

    it('should make two ajax calls when dealing with two channels in a not-so-short period', function(done) {
      this.client.subscribe('/foobar');
      this.client.publish('/foobar', {text: 'hallo'});

      var self = this;

      setTimeout(function() {
        self.client.subscribe('/bar');
        self.client.publish('/bar', {text: 'hallo'});

        setTimeout(function() {
          expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
          done();
        }, 500);
      }, 250);
    });

    it('should make two ajax calls when dealing with three channels and separating calls', function(done) {
      this.client.subscribe('/foobar');
      this.client.publish('/foobar', {text: 'hallo'});

      var self = this;

      setTimeout(function() {
        self.client.subscribe('/bar');
        self.client.publish('/bar', {text: 'hallo'});

        self.client.subscribe('/baz');
        self.client.publish('/baz', {text: 'hallo'});

        setTimeout(function() {
          expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
          var first_auth = jasmine.Ajax.requests.at(1);
          var second_auth = jasmine.Ajax.requests.at(2);
          expect(first_auth.data()['messages[0][channel]'][0]).toBe('/foobar');
          expect(first_auth.data()['messages[1]']).toBe(undefined);

          expect(second_auth.data()['messages[0][channel]'][0]).toBe('/bar');
          expect(second_auth.data()['messages[1][channel]'][0]).toBe('/baz');
          done();
        }, 500);
      }, 250);
    });

    it('should make only one ajax calls when subscribing several times in a short period', function(done) {
      var self = this;
      this.client.subscribe('/foobar');
      setTimeout(function() {
        self.client.subscribe('/foobar2');
        setTimeout(function() {
          self.client.subscribe('/foobar3');
        }, 50)
      }, 50);
      setTimeout(function() {
        expect(jasmine.Ajax.requests.count()).toBe(2); // Handshake + auth
        var request = jasmine.Ajax.requests.mostRecent();
        expect(request.data()['messages[0][channel]'][0]).toBe('/foobar');
        expect(request.data()['messages[1][channel]'][0]).toBe('/foobar2');
        expect(request.data()['messages[2][channel]'][0]).toBe('/foobar3');
        done();
      }, 500);
    });

    it('tries to get a new signature when the used signature is bad or expired', function(done) {
      jasmine.Ajax.stubRequest('/faye/auth').andReturn({
        'responseText': '{"signature": "bad"}'
      });
      var self = this;
      this.client.subscribe('/toto').then(undefined, function() {
        expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
        done();
      });
    });

    it('retries for the signature after a configured delay', function(done) {
      jasmine.Ajax.stubRequest('/faye/auth').andReturn({
        'responseText': '{"signature": "bad"}'
      });
      var self = this;
      var finished = false;
      this.client.subscribe('/toto').then(undefined, function() {
        finished = true;
      });

      setTimeout(function() {

        // Initial 200ms batching delay

        setTimeout(function() {
          expect(finished).toBe(false);
        }, 200 + 80); // 2nd Batching delay + 80 ms

        setTimeout(function() {
          expect(finished).toBe(true);
          done();
        }, 200 + 200); // 2nd Batching delay + 200 ms
      }, 200);
    });

    it('calls the success callback for a successfully retried message', function(done) {

      this.client.subscribe('/foo').then(function() {
        expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
        done();
      }, function(e) { console.log(e)});

      setTimeout(function() {
        var request = jasmine.Ajax.requests.mostRecent();
        var params = queryString.parse(request.params);

        var jwtsign_bad   = new jwt.WebToken('{"clientId": "' + params['messages[0][clientId]'] + '", "channel": "/foo", "exp": 1}', '{"alg": "HS256"}');
        var signature_bad = jwtsign_bad.serialize("macaroni");

        var jwtsign_good   = new jwt.WebToken('{"clientId": "' + params['messages[0][clientId]'] + '", "channel": "/foo", "exp": 2803694528}', '{"alg": "HS256"}');
        var signature_good = jwtsign_good.serialize("macaroni");

        request.response({
          'status' : 200,
          'responseText': '{"signatures": [{"channel": "/foo", "clientId": "'+ params['messages[0][clientId]'] +'", "signature":  "' + signature_bad + '"}]}'
        });

        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signatures": [{"channel": "/foo", "clientId": "'+ params['messages[0][clientId]'] +'", "signature":  "' + signature_good + '"}]}'
        });

      }, 1000);

    });

  });
});
