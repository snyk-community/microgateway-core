'use strict';
var assert = require('assert');
var gatewayService = require('../index');
var serverFactory = require('./hello_rest/index');
var TestPlugin = require('./testPlugin');
var request = require('request');
var should = require('should')


describe('test lifecycle events', function() {

  var port = 3300;
  var gatewayPort = 8800;
  var config = {};
  var gateway;
  var bodyMap = {
    get: { "get": "gettest" },
    post: { "post": "posttest" },
    put: { "put": "puttest" },
    delete: { "delete": "deletetest" }

  }
  var server = serverFactory(bodyMap);
  config = {
    edgemicro: {
      port: gatewayPort,
      logging: { level: 'info', dir: './tests/log' }
    },
    proxies: [
      { base_path: '/v1', secure: false, url: 'http://localhost:' + port }
    ]
  };
  beforeEach(function(done) {
    server.listen(port, function() {
      console.log('%s listening at %s', server.name, server.url);
      gateway = gatewayService(config);
      done();
    });


  });
  afterEach(function(done) {
    gateway && gateway.stop(() => {
    });
    server.close();
    done();
  })

  it('call promises', function(done) {
    var j = 0;
    const p = new Promise(function(resolve, reject) {
      resolve(j++);
    });
    var doned = false;
    for (var i = 0; i < 10; i++) {
      p.then(function(m) {
        assert(m == 0);
        if (i == 10 && !doned) {
          doned = true;
          done();
        }
      })
      process.nextTick(function() {
      });
    }
  });
  it('POST lifecycle all events run', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse', 'ondata_response', 'onend_response'];
    var types = {};
    var startMs = 500;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 50;
      setTimeout(() => {
        types[type] = data;
        cb();
      }, startMs);

    });
    var handler = testPlugin.init();
    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "POST",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
        json: { "test": "123" }
      }, (err, r, body) => {
        assert(!err, err);
        assert.deepEqual(body, { "post": bodyMap['post'], body: { "test": "123" } });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });

  it('POST manipulate data with lifecycle all events run', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse', 'ondata_response', 'onend_response'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        if (type === 'ondata_response') {
          // var json = JSON.parse(data);
          // console.log(json);

          // console.log(testPlugin.expectedHeaders)
        }
        assert.equal(
          _findHeaders(data.sourceResponse.headers(), testPlugin.expectedHeaders).length, testPlugin.expectedHeaders.length
        );
        cb();
      }, startMs);

    });
    var handler = testPlugin.init();
    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "POST",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
        json: { "test": "123" }
      }, (err, r, body) => {
        assert(!err, body);
        assert.deepEqual(body, { "post": bodyMap['post'], body: { "test": "123" } });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });


  it('GET lifecycle all events run', function(done) {
    this.timeout(20000);
    var expectedTypes = ['onrequest', 'onend_request', 'onresponse', 'ondata_response', 'onend_response'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        cb();
      }, startMs);

    });
    var handler = testPlugin.init();
    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({ method: "GET", url: 'http://localhost:' + gatewayPort + '/v1/echo/get', json: true }, (err, r, body) => {
        assert(!err, body);
        assert.deepEqual(body, { "get": bodyMap['get'] });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });

  it('PUT lifecycle all events run', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse', 'ondata_response', 'onend_response'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        cb();
      }, startMs);

    });
    var handler = testPlugin.init()
    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "PUT",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/put',
        json: { "test": "1234" }
      }, (err, r, body) => {
        assert(!err, err);
        assert.deepEqual(body, { "put": bodyMap['put'], body: { "test": "1234" } });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });


  it('POST lifecycle terminate on response', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        if (type === "onresponse") {

        }
        cb();
      }, startMs);

    });
    var handler = testPlugin.init()

    handler.onresponse = function(req, res, data, next) {
      types['onresponse'] = data;
      res.setHeader("x-onresponse-visited", 'true');
      testPlugin.expectedHeaders.push("x-onresponse-visited");
      res.statusCode = 266;
      try {
        res.end(JSON.stringify({ post: { post: 'posttested' }, body: { test: '123modified' } }));
      } catch (e) {
        console.log(e);
      }
      next(true, null);
    };

    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "POST",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
        json: { "test": "123" }
      }, (err, r, body) => {
        assert(!err, body);
        assert.equal(r.statusCode, 266);
        assert.deepEqual(body, { "post": { post: 'posttested' }, body: { "test": "123modified" } });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });

  it('POST returns error', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;

        cb();
      }, startMs);

    });
    var handler = testPlugin.init()


    handler.onresponse = function(req, res, data, next) {
      types['onresponse'] = data;
      res.setHeader("x-onresponse-visited", 'true');
      testPlugin.expectedHeaders.push("x-onresponse-visited");
      throw new Error("test is barked");
    };

    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "POST",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
        json: { "test": "123" }
      }, (err, r, body) => {
        assert(!err, body);
        assert.equal(r.statusCode, 500);
        assert.deepEqual(body, { message: 'test is barked' });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });

  it('POST throws exception', function(done) {
    this.timeout(20000);
    var expectedTypes = ['ondata_request', 'onrequest', 'onend_request', 'onresponse'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        cb();
      }, startMs);

    });
    var handler = testPlugin.init()

    handler.onresponse = function(req, res, data, next) {
      types['onresponse'] = data;
      res.setHeader("x-onresponse-visited", 'true');
      testPlugin.expectedHeaders.push("x-onresponse-visited");
      next(new Error("test is borked"));
    };

    gateway.addPlugin('test', function test() { return handler });
    gateway.start(function(err) {
      assert(!err, err);
      request({
        method: "POST",
        url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
        json: { "test": "123" }
      }, (err, r, body) => {
        assert(!err, body);
        assert.equal(r.statusCode, 500);
        assert.deepEqual(body, { message: 'test is borked' });//confirm echo and body are returned

        var keys = Object.keys(types);
        assert.deepEqual(keys.sort(), expectedTypes.sort());
        done();
      });
    });
  });

  it('server died should have an error', function(done) {
    this.timeout(20000);
    var expectedTypes = ['onerror_request', 'onrequest'];
    var types = {};
    var startMs = 1000;
    var testPlugin = TestPlugin(function(type, data, cb) {
      startMs = startMs - 200;
      setTimeout(() => {
        types[type] = data;
        cb();
      }, startMs);

    });
    var handler = testPlugin.init()
    server.close(() => {
      gateway.addPlugin('test', function test() { return handler });
      gateway.start(function(err) {
        assert(!err, err);
        request({
          method: "POST",
          url: 'http://localhost:' + gatewayPort + '/v1/echo/post',
          json: { "test": "123" }
        }, (err, r, body) => {
          assert(!err, body);
          assert.equal(r.statusCode, 502);
          assert.deepEqual(body.code, "ECONNREFUSED");//confirm echo and body are returned

          var keys = Object.keys(types);
          assert.deepEqual(keys.sort(), expectedTypes.sort());
          done();
        });
      });
    });

  });

});

function _findHeaders(headers, expectedHeaders) {
  var foundHeaders = expectedHeaders.filter((val) => {
    return headers[val];
  })
  return foundHeaders;
}