'use strict';

var Writable = require('streamx').Writable;

function hasListeners(stream) {
  return !!(stream.listenerCount('readable') || stream.listenerCount('data'));
}

function sink(stream) {
  var sinkAdded = false;

  var sinkStream = new Writable();

  function addSink() {
    if (sinkAdded) {
      return;
    }

    if (hasListeners(stream)) {
      return;
    }

    sinkAdded = true;
    stream.pipe(sinkStream);
  }

  function removeSink(evt) {
    if (evt !== 'readable' && evt !== 'data') {
      return;
    }

    if (hasListeners(stream)) {
      sinkAdded = false;
      stream.unpipe(sinkStream);
    }
  }

  stream.on('newListener', removeSink);
  stream.on('removeListener', removeSink);
  stream.on('removeListener', addSink);

  // Sink the stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(addSink);

  return stream;
}

module.exports = sink;
