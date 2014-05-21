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
      this.extension = new FayeAuthentication();
      this.client.addExtension(this.extension);
    });

    function stubSignature(context, callback) {
      var self = context;
      self.client.handshake(function() {
        var signature = CryptoJS.HmacSHA1("/foobar-" + self.client._clientId, "macaroni").toString();

        jasmine.Ajax.stubRequest('/faye/auth').andReturn({
          'responseText': '{"signature": "' + signature + '"}'
        });
        callback();
      }, self.client);
    }

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

    it('clears the signatures when receiving an error from the server', function(done) {
      this.extension._signatures = {'123': []};
      jasmine.Ajax.stubRequest('/faye/auth').andReturn({
        'responseText': '{"signature": "bad"}'
      });
      var self = this;
      this.client.subscribe('/toto').then(undefined, function() {
        expect(Object.keys(self.extension._signatures).length).toBe(0);
        done();
      });

    });
  });
});
