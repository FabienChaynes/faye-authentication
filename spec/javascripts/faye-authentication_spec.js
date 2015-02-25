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

});
