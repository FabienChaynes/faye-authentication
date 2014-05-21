describe('faye-authentication', function() {

  describe('constructor', function() {

    it('sets endpoint to /faye by default', function() {
      var auth = new FayeAuthentication();
      expect(auth.endpoint()).toBe('/faye/auth');
    });

    it('can specify a custom endpoint', function() {
      var auth = new FayeAuthentication('/custom');
      expect(auth.endpoint()).toBe('/custom');
    });

  });

  describe('extension', function() {
    beforeEach(function() {
      jasmine.Ajax.install();
      this.auth = new FayeAuthentication();
      this.client = new Faye.Client('http://localhost:9296/faye');
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
        console.log(request);
        expect(request.data().channel[0]).toBe('/meta/subscribe');
        expect(request.data().subscription[0]).toBe('/foobar');
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

      it('should make only one ajax call when dealing with one channel', function(done) {
        this.client.subscribe('/foobar');
        this.client.publish('/foobar', {text: 'hallo'});
        this.client.publish('/foobar', {text: 'hallo'});

        setTimeout(function() {
          expect(jasmine.Ajax.requests.count()).toBe(2); // Handshake + auth
          done();
        }, 500);

      })

      it('should make two ajax calls when dealing with two channels', function(done) {
        this.client.subscribe('/foo');
        this.client.publish('/foo', {text: 'hallo'});
        this.client.publish('/foo', {text: 'hallo'});

        this.client.subscribe('/bar');
        this.client.publish('/bar', {text: 'hallo'});
        this.client.publish('/bar', {text: 'hallo'});

        setTimeout(function() {
          expect(jasmine.Ajax.requests.count()).toBe(3); // Handshake + auth * 2
          done();
        }, 500);
      });
    });

  });


})
