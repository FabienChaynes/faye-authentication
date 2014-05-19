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

  });


})
