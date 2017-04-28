'use strict';

var expect = require('expect');
var miss = require('mississippi');

var sink = require('../');

var to = miss.to;
var from = miss.from;
var pipe = miss.pipe;
var through = miss.through;

function noop() {}

function count(value) {
  var count = 0;
  return through.obj(function(file, enc, cb) {
    count++;
    cb(null, file);
  }, function(cb) {
    expect(count).toEqual(value);
    cb();
  });
}

function slowCount(value) {
  var count = 0;
  return to.obj(function(file, enc, cb) {
    count++;

    setTimeout(function() {
      cb(null, file);
    }, 250);
  }, function(cb) {
    expect(count).toEqual(value);
    cb();
  });
}

describe('lead', function() {

  it('respects objectMode of wrapped stream', function(done) {
    var write = sink(through());

    function assert(err) {
      // Forced an object through a non-object stream
      expect(err).toExist();
      done();
    }

    pipe([
      from.obj([{}]),
      // Must be in the Writable position to test this
      // So concat-stream cannot be used
      write,
    ], assert);
  });

  it('does not get clogged by highWaterMark', function(done) {
    var expectedCount = 17;
    var highwatermarkObjs = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      highwatermarkObjs.push({});
    }

    var write = sink(through.obj());

    pipe([
      from.obj(highwatermarkObjs),
      count(expectedCount),
      // Must be in the Writable position to test this
      // So concat-stream cannot be used
      write,
    ], done);
  });

  it('allows backpressure when piped to another, slower stream', function(done) {
    this.timeout(20000);

    var expectedCount = 24;
    var highwatermarkObjs = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      highwatermarkObjs.push({});
    }

    var write = sink(through.obj());

    pipe([
      from.obj(highwatermarkObjs),
      count(expectedCount),
      write,
      slowCount(expectedCount),
    ], done);
  });

  it('respects readable listeners on wrapped stream', function(done) {
    var write = sink(through.obj());

    var readables = 0;
    write.on('readable', function() {
      var data = write.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      expect(readables).toEqual(1);
      done(err);
    }

    pipe([
      from.obj([{}]),
      write,
    ], assert);
  });

  it('respects data listeners on wrapped stream', function(done) {
    var write = sink(through.obj());

    var datas = 0;
    write.on('data', function() {
      datas++;
    });

    function assert(err) {
      expect(datas).toEqual(1);
      done(err);
    }

    pipe([
      from.obj([{}]),
      write,
    ], assert);
  });

  it('sinks the stream if all the readable event handlers are removed', function(done) {
    var expectedCount = 17;
    var highwatermarkObjs = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      highwatermarkObjs.push({});
    }

    var write = sink(through.obj());

    write.on('readable', noop);

    pipe([
      from.obj(highwatermarkObjs),
      count(expectedCount),
      // Must be in the Writable position to test this
      // So concat-stream cannot be used
      write,
    ], done);

    process.nextTick(function() {
      write.removeListener('readable', noop);
    });
  });

  it('does not sink the stream if an event handler still exists when one is removed', function(done) {
    var expectedCount = 17;
    var highwatermarkObjs = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      highwatermarkObjs.push({});
    }

    var write = sink(through.obj());

    write.on('readable', noop);
    var readables = 0;
    write.on('readable', function() {
      var data = write.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      expect(readables).toEqual(expectedCount);
      done(err);
    }

    pipe([
      from.obj(highwatermarkObjs),
      count(expectedCount),
      // Must be in the Writable position to test this
      // So concat-stream cannot be used
      write,
    ], assert);

    process.nextTick(function() {
      write.removeListener('readable', noop);
    });
  });

  it('sinks the stream if all the data event handlers are removed', function(done) {
    var expectedCount = 17;
    var highwatermarkObjs = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      highwatermarkObjs.push({});
    }

    var write = sink(through.obj());

    write.on('data', noop);

    pipe([
      from.obj(highwatermarkObjs),
      count(expectedCount),
      // Must be in the Writable position to test this
      // So concat-stream cannot be used
      write,
    ], done);

    process.nextTick(function() {
      write.removeListener('data', noop);
    });
  });
});
