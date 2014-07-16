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
    });

    function sharedExamplesForSubscribeAndPublish() {
      it('returns true if no options is passed', function() {
        expect(this.auth.authentication_required(this.message)).toBe(true);
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

        this.fake_transport = {connectionType: "fake", endpoint: {}, send: function() {}};
        spyOn(this.fake_transport, 'send');
      });

      it('should add the signature to subscribe message', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._transport = self.fake_transport
          self.client.subscribe('/foobar');
        }, this.client);

        setTimeout(function() {
          var calls = self.fake_transport.send.calls.all();
          var last_call = calls[calls.length - 1];
          var message = last_call.args[0].message;
          expect(message.channel).toBe('/meta/subscribe');
          expect(message.signature).toBe('foobarsignature');
          done();
        }, 500);

      });

      it('should add the signature to publish message', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._transport = self.fake_transport
          self.client.publish('/foobar', {text: 'hallo'});
        }, this.client);

        setTimeout(function() {
          var calls = self.fake_transport.send.calls.all();
          var last_call = calls[calls.length - 1];
          var message = last_call.args[0].message;
          expect(message.channel).toBe('/foobar');
          expect(message.signature).toBe('foobarsignature');
          done();
        }, 500);
      });

      it('preserves messages integrity', function(done) {
        var self = this;

        this.client.handshake(function() {
          self.client._transport = self.fake_transport
          self.client.publish('/foo', {text: 'hallo'});
          self.client.subscribe('/foo');
        }, this.client);

        setTimeout(function() {
          var calls = self.fake_transport.send.calls.all();
          var subscribe_call = calls[calls.length - 1];
          var publish_call = calls[calls.length - 2];
          var subscribe_message = subscribe_call.args[0].message;
          var publish_message = publish_call.args[0].message;
          expect(publish_message.channel).toBe('/foo');
          expect(subscribe_message.channel).toBe('/meta/subscribe');
          expect(publish_message.signature).toBe('foobarsignature');
          expect(subscribe_message.signature).toBe('foobarsignature');
          done();
        }, 500);
      });

      it('does not add the signature if authentication is not required', function(done) {
        var self = this;

        spyOn(this.auth, 'authentication_required').and.returnValue(false);

        this.client.handshake(function() {
          self.client._transport = self.fake_transport
          self.client.publish('/foobar', {text: 'hallo'});
        }, this.client);

        setTimeout(function() {
          var calls = self.fake_transport.send.calls.all();
          var last_call = calls[calls.length - 1];
          var message = last_call.args[0].message;
          expect(message.channel).toBe('/foobar');
          expect(message.signature).toBe(undefined);
          done();
        }, 500);
      });

    });
  });
});
