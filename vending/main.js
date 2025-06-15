var GrovePi = require('node-grovepi').GrovePi;
var PDTRelay = GrovePi.sensors.SPDTRelay;
var Board = GrovePi.board;
var express = require('express');
var app = express();
var relay;

var board = new Board({
  debug: true,
  onError: function(err) {
    console.log('Something wrong just happened')
    console.log(err)
  },
  onInit: function(res) {
    console.log('onInit');

    if (res) {
      console.log('GrovePi Version :: ' + board.version())

      relay = new PDTRelay(3);
    }
  }
});

app.post('/release-sim', function (req, res) {
  relay.on();
  setTimeout(relayOff, 5000);

  res.send('OK');
});

function relayOff() {
  relay.off();
}

function onServerStarted () {
  console.log('Server started on port 9000');
}

function init () {
  board.init();
  app.listen(9000, onServerStarted);
}

init();

