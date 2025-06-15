var WebSocketClient = require('websocket').client;
var request = require('request');

module.exports = function (RED) {

  function PxTimeseriesIngest (configVal) {
    var self = this,
        config = configVal,
        client,
        uaaConfig = RED.nodes.getNode(config._credentials),
        connection,
        connecting = false;

    function init () {
      RED.nodes.createNode(self, config);
      self.log(uaaConfig);
      self.on('input', processInput);
    }

    function connectToPredix(fn) {
      self.log(JSON.stringify([config.url, config.predixZoneId]));

      if (connection && connection.connected) {
        fn();
        return;
      }

      uaaConfig.requestAuthToken(function (err, authToken) {
        if (!connecting) {
          client = new WebSocketClient(); 
          client.connect(config.url, null, null, headers(authToken.token));
          client.on('connect', function (conn) { onConnectionEstablished(conn); fn(); });
          client.on('connectFailed', processError);
          connecting = true;
        } else {
          client.on('connect', function (conn) { fn(); });
        }
      });
    }

    function onConnectionEstablished (conn) {
      connection = conn;
      connecting = false;
      self.log(conn);

      connection.on('error', processError);
      connection.on('close', onConnectionClosed);
      connection.on('message', onServerMessage);
    }

    function processInput (msg) {
      connectToPredix(function () {
        sendData(msg.payload);
      });
    }

    function sendData(data) {
      if (connection.connected) {
          connection.sendUTF(toJson(data));
          self.log(toJson(data));
      }
    }

    function onServerMessage (response) {
      if (response.type === 'utf8') {
          self.log("Received: '" + response.utf8Data + "'");
      }
    }

    function headers (authToken) {
      return {
        Authorization: 'Bearer $token'.replace('$token', authToken),
        Origin: 'http://localhost',
        'Predix-Zone-Id': config.predixZoneId
      };
    }

    function processError (error) {
      self.error('Error: ' + error.toString(), error);
    }

    function onConnectionClosed () {
      self.log('Connection Closed');
    }

    function toJson(data) {
      if (typeof data !== 'string') {
        return JSON.stringify(data);
      } else {
        return data;
      }
    }

    init ();
  }

  RED.nodes.registerType("px-timeseries-ingest", PxTimeseriesIngest);
};
