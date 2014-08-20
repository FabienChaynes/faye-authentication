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
