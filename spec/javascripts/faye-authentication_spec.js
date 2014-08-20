describe('faye-authentication', function() {

  describe('constructor', function() {

    it('sets endpoint to /faye by default', function() {
      var auth = new FayeAuthentication(new Faye.Client('http://example.com'));
      expect(auth.endpoint()).toBe('/faye/auth');
    });

    it('can specify a custom endpoint', function() {
      var auth = new FayeAuthentication(new Faye.Client('http://example.com'), '/custom');
      expect(auth.endpoint()).toBe('/custom');
    });

  });

  describe('authentication_required', function() {

    beforeEach(function() {
      this.auth = new FayeAuthentication(new Faye.Client('http://example.com'));
      Faye.logger = null;
    });

    function sharedExamplesForSubscribeAndPublish() {
      it('returns true if no options is passed', function() {
        expect(this.auth.authentication_required(this.message)).toBe(true);
      });

      it('calls function with subscription or channel', function() {
        this.auth._options.whitelist = function(message) { return(true); }
        spyOn(this.auth._options, 'whitelist');
        this.auth.authentication_required(this.message);
        expect(this.auth._options.whitelist).toHaveBeenCalledWith(this.message.subscription || this.message.channel);
      });

      it('logs error if the function throws', function() {
        this.auth._options.whitelist = function(message) { throw new Error("boom"); }
        Faye.logger = {error: function() {}};
        spyOn(Faye.logger, 'error');
        this.auth.authentication_required(this.message);
        expect(Faye.logger.error).toHaveBeenCalledWith('[Faye] Error caught when evaluating whitelist function : boom');
      });

      it ('returns false if function returns true', function() {
        this.auth._options.whitelist = function(message) { return(true); }
        expect(this.auth.authentication_required(this.message)).toBe(false);
      });

      it ('returns true if function returns false', function() {
        this.auth._options.whitelist = function(message) { return(false); }
        expect(this.auth.authentication_required(this.message)).toBe(true);
      });
    }

    function sharedExamplesForMetaExceptPublish() {
      it('returns false if no options is passed', function() {
        expect(this.auth.authentication_required(this.message)).toBe(false);
      });

      it ('returns false if function returns true', function() {
        this.auth._options.whitelist = function(message) { return(true); }
        expect(this.auth.authentication_required(this.message)).toBe(false);
      });

      it ('returns false if function returns false', function() {
        this.auth._options.whitelist = function(message) { return(false); }
        expect(this.auth.authentication_required(this.message)).toBe(false);
      });
    }

    describe('publish', function() {

      beforeEach(function() {
        this.message = {'channel': '/foobar'};
      });

      sharedExamplesForSubscribeAndPublish();
    });

    describe('subscribe', function() {
      beforeEach(function() {
        this.message = {'channel': '/meta/subscribe', 'subscription': '/foobar'};
      });

      sharedExamplesForSubscribeAndPublish();
    });

    describe('handshake', function() {
      beforeEach(function() {
        this.message = {'channel': '/meta/handshake'};
      });

      sharedExamplesForMetaExceptPublish();
    });

    describe('connect', function() {
      beforeEach(function() {
        this.message = {'channel': '/meta/connect'};
      });

      sharedExamplesForMetaExceptPublish();
    });

    describe('unsubscribe', function() {
      beforeEach(function() {
        this.message = {'channel': '/meta/unsubscribe', 'handshake': '/foobar'};
      });

      sharedExamplesForMetaExceptPublish();
    });

  });

  describe('extension', function() {
    beforeEach(function() {
      jasmine.Ajax.install();
      this.client = new Faye.Client('http://localhost:9296/faye');
      this.auth = new FayeAuthentication(this.client);
      this.client.addExtension(this.auth);
    });

    afterEach(function() {
      jasmine.Ajax.uninstall();
    });

    it('should make an ajax request to the extension endpoint', function(done) {
      this.client.subscribe('/foobar');
      var self = this;
      setTimeout(function() {
        var request = jasmine.Ajax.requests.mostRecent();
        expect(request.url).toBe(self.auth.endpoint());
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

        spyOn(this.auth, 'authentication_required').and.returnValue(false);

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
  });
});
