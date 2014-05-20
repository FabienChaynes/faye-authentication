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
      }, 1000);
    });

    it('should add the signature to the message', function(done) {

      jasmine.Ajax.stubRequest('/faye/auth').andReturn({
        'responseText': '{"signature": "foobarsignature"}'
      });

      var fake_transport = {connectionType: "fake", endpoint: {}, send: function() {}};
      spyOn(fake_transport, 'send');

      var self = this;

      this.client.handshake(function() {
        self.client._transport = fake_transport
        self.client.subscribe('/foobar');
      }, this.client);

      setTimeout(function() {
        var calls = fake_transport.send.calls.all();
        var last_call = calls[calls.length - 1];
        var message = last_call.args[0].message;
        expect(message.channel).toBe('/meta/subscribe');
        expect(message.signature).toBe('foobarsignature');
        done();
      }, 1000);

    });

  });


})
