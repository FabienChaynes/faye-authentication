describe('Faye extension', function() {
  beforeEach(function() {
    this.client = new Faye.Client('http://localhost:9296/faye');
    jasmine.Ajax.install();
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  describe('Without extension', function() {
    it('fails to subscribe', function(done) {
      this.client.subscribe('/foobar').then(undefined, function() {
        done();
      });
    });

    it('fails to publish', function(done) {
      this.client.publish('/foobar', {text: 'whatever'}).then(undefined, function() {
        done();
      });
    });
  });

  describe('With extension', function() {
    beforeEach(function() {
      this.extension = new FayeAuthentication(this.client);
      this.client.addExtension(this.extension);
    });

    function stubSignature(context, callback) {
      var self = context;
      self.client.handshake(function() {
        var jwtsign = new jwt.WebToken('{"clientId": "' + self.client._dispatcher.clientId + '", "channel": "/foobar", "exp": 2803694528}', '{"alg": "HS256"}');
        var signature = jwtsign.serialize("macaroni");

        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signature": "' + signature + '"}'
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
        expect(request.data()['message[channel]'][0]).toBe('/foobar');
        done();
      }, 500);
    });


    describe('signature', function() {

      beforeEach(function() {
        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signature": "foobarsignature"}'
        });

        this.dispatcher = {connectionType: "fake", sendMessage: function() {}, selectTransport: function() { }};
        spyOn(this.dispatcher, 'sendMessage');
        spyOn(this.dispatcher, 'selectTransport');
        Faye.extend(this.dispatcher, Faye.Publisher)
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
          self.client.publish('/foo', {text: 'hallo'});
          self.client.subscribe('/foo');

          setTimeout(function() {
            var calls = self.dispatcher.sendMessage.calls.all();
            var subscribe_call = calls[calls.length - 1];
            var publish_call = calls[calls.length - 2];
            var subscribe_message = subscribe_call.args[0];
            var publish_message = publish_call.args[0];
            expect(publish_message.channel).toBe('/foo');
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
      this.client.publish('/foobar', {text: 'hallo'});

      setTimeout(function() {
        expect(jasmine.Ajax.requests.count()).toBe(2); // Handshake + auth * 1
        done();
      }, 500);

    })

    it('should make two ajax calls when dealing with two channels', function(done) {
      this.client.subscribe('/foobar');
      this.client.publish('/foobar', {text: 'hallo'});
      this.client.publish('/foobar', {text: 'hallo'});

      this.client.subscribe('/bar');
      this.client.publish('/bar', {text: 'hallo'});
      this.client.publish('/bar', {text: 'hallo'});

      setTimeout(function() {
        expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
        done();
      }, 500);
    });

    it('tries to get a new signature immediately when the used signature is bad or expired', function(done) {
      jasmine.Ajax.stubRequest('/faye/auth').andReturn({
        'responseText': '{"signature": "bad"}'
      });
      var self = this;
      this.client.subscribe('/toto').then(undefined, function() {
        expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
        done();
      });
    });

    it('calls the success callback for a successfully retried message', function(done) {

      this.client.subscribe('/foo').then(function() {
        expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
        done();
      }, function(e) { console.log(e)});

      setTimeout(function() {
        var request = jasmine.Ajax.requests.mostRecent();
        var params = queryString.parse(request.params);

        var jwtsign_bad   = new jwt.WebToken('{"clientId": "' + params['message[clientId]'] + '", "channel": "/foo", "exp": 1}', '{"alg": "HS256"}');
        var signature_bad = jwtsign_bad.serialize("macaroni");

        var jwtsign_good   = new jwt.WebToken('{"clientId": "' + params['message[clientId]'] + '", "channel": "/foo", "exp": 2803694528}', '{"alg": "HS256"}');
        var signature_good = jwtsign_good.serialize("macaroni");

        request.response({
          'status' : 200,
          'responseText': '{"signature": "' + signature_bad + '"}'
        });

        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signature": "' + signature_good + '"}'
        });

      }, 1000);

    });

  });
});
