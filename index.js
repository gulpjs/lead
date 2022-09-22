'use strict';

function hasListeners(stream) {
  return !!(stream.listenerCount('readable') || stream.listenerCount('data'));
}

function sink(stream) {
  var sinkAdded = false;

  function addSink() {
    if (sinkAdded) {
      return;
    }

    if (hasListeners(stream)) {
      return;
    }

    // This is a streamx implementation detail
    // TODO: Mabye upstream as `isActive`?
    if (stream._readableState.pipeTo) {
      return;
    }

    sinkAdded = true;
    stream.resume();
  }

  function removeSink(evt) {
    if (evt !== 'readable' && evt !== 'data') {
      return;
    }

    if (hasListeners(stream)) {
      sinkAdded = false;
    }

    process.nextTick(addSink);
  }

  stream.on('newListener', removeSink);
  stream.on('removeListener', removeSink);

  // Sink the stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(addSink);

  return stream;
}

module.exports = sink;
