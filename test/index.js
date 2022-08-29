'use strict';

var expect = require('expect');

var sink = require('../');

function noop() {}

suite('stream');
suite('streamx');
suite('readable-stream');

function suite(moduleName) {
  var stream = require(moduleName);

  function count(value) {
    var count = 0;
    return new stream.Transform({
      objectMode: true,
      transform: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        count++;
        cb(null, file);
      },
      flush: function (cb) {
        expect(count).toEqual(value);
        cb();
      },
    });
  }

  function slowCount(value) {
    var count = 0;
    return new stream.Writable({
      objectMode: true,
      write: function (file, enc, cb) {
        if (typeof enc === 'function') {
          cb = enc;
        }

        count++;

        setTimeout(function () {
          cb(null, file);
        }, 250);
      },
      flush: function (cb) {
        expect(count).toEqual(value);
        cb();
      },
    });
  }
  describe('lead (' + moduleName + ')', function () {
    it('can wrap binary stream', function (done) {
      var write = sink(new stream.PassThrough());

      function assert(err) {
        // Forced an object through a non-object stream
        expect(err).toBeFalsy();
        done();
      }

      stream.pipeline([stream.Readable.from(['1', '2', '3']), write], assert);
    });

    it('can wrap object stream', function (done) {
      var write = sink(new stream.PassThrough({ objectMode: true }));

      function assert(err) {
        // Forced an object through a non-object stream
        expect(err).toBeFalsy();
        done();
      }

      stream.pipeline([stream.Readable.from([{}, {}, {}]), write], assert);
    });

    if (moduleName !== 'streamx') {
      it('does not convert between object and binary stream', function (done) {
        var write = sink(new stream.PassThrough());

        // TODO: Node core stream seems to have changed something here
        function assert(err) {
          // Forced an object through a non-object stream
          expect(err).toBeTruthy();
          done();
        }

        stream.pipeline([stream.Readable.from([{}, {}, {}]), write], assert);
      });
    } else {
      // Streamx does automatic conversion between object and binary streams
      it('converts between object and binary stream', function (done) {
        var write = sink(new stream.PassThrough());

        function assert(err) {
          expect(err).toBeFalsy();
          done();
        }

        stream.pipeline(
          [
            stream.Readable.from([{}, {}, {}]),
            // Must be in the Writable position to test this
            // So concat-stream cannot be used
            write,
          ],
          assert
        );
      });
    }

    it('does not get clogged by highWaterMark', function (done) {
      var expectedCount = 17;
      var highwatermarkObjs = [];
      for (var idx = 0; idx < expectedCount; idx++) {
        highwatermarkObjs.push({});
      }

      var write = sink(new stream.PassThrough({ objectMode: true }));

      stream.pipeline(
        [stream.Readable.from(highwatermarkObjs), count(expectedCount), write],
        done
      );
    });

    it('allows backpressure when piped to another, slower stream', function (done) {
      this.timeout(20000);

      var expectedCount = 24;
      var highwatermarkObjs = [];
      for (var idx = 0; idx < expectedCount; idx++) {
        highwatermarkObjs.push({});
      }

      var write = sink(new stream.PassThrough({ objectMode: true }));

      stream.pipeline(
        [
          stream.Readable.from(highwatermarkObjs),
          count(expectedCount),
          write,
          slowCount(expectedCount),
        ],
        done
      );
    });

    it('respects readable listeners on wrapped stream', function (done) {
      var write = sink(new stream.PassThrough({ objectMode: true }));

      var readables = 0;
      write.on('readable', function () {
        while (write.read()) {
          readables++;
        }
      });

      function assert(err) {
        expect(readables).toEqual(1);
        done(err);
      }

      stream.pipeline([stream.Readable.from([{}]), write], assert);
    });

    it('respects data listeners on wrapped stream', function (done) {
      var write = sink(new stream.PassThrough({ objectMode: true }));

      var datas = 0;
      write.on('data', function () {
        datas++;
      });

      function assert(err) {
        expect(datas).toEqual(1);
        done(err);
      }

      stream.pipeline([stream.Readable.from([{}]), write], assert);
    });

    it('sinks the stream if all the readable event handlers are removed', function (done) {
      var expectedCount = 17;
      var highwatermarkObjs = [];
      for (var idx = 0; idx < expectedCount; idx++) {
        highwatermarkObjs.push({});
      }

      var write = sink(new stream.PassThrough({ objectMode: true }));

      write.on('readable', noop);

      stream.pipeline(
        [stream.Readable.from(highwatermarkObjs), count(expectedCount), write],
        done
      );

      process.nextTick(function () {
        write.removeListener('readable', noop);
      });
    });

    it('does not sink the stream if an event handler still exists when one is removed', function (done) {
      var expectedCount = 17;
      var highwatermarkObjs = [];
      for (var idx = 0; idx < expectedCount; idx++) {
        highwatermarkObjs.push({});
      }

      var write = sink(new stream.PassThrough({ objectMode: true }));

      write.on('readable', noop);
      var readables = 0;
      write.on('readable', function () {
        while (write.read()) {
          readables++;
        }
      });

      function assert(err) {
        expect(readables).toEqual(expectedCount);
        done(err);
      }

      stream.pipeline(
        [stream.Readable.from(highwatermarkObjs), count(expectedCount), write],
        assert
      );

      process.nextTick(function () {
        write.removeListener('readable', noop);
      });
    });

    it('sinks the stream if all the data event handlers are removed', function (done) {
      var expectedCount = 17;
      var highwatermarkObjs = [];
      for (var idx = 0; idx < expectedCount; idx++) {
        highwatermarkObjs.push({});
      }

      var write = sink(new stream.PassThrough({ objectMode: true }));

      write.on('data', noop);

      stream.pipeline(
        [stream.Readable.from(highwatermarkObjs), count(expectedCount), write],
        done
      );

      process.nextTick(function () {
        write.removeListener('data', noop);
      });
    });
  });
}
