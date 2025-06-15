var WebSocketClient = require('websocket').client;
var request = require('request');

module.exports = function (RED) {

  function PxTimeseriesIngest (configVal) {
    var self = this,
        config = configVal,
        client = new WebSocketClient(),
        serviceConfig = RED.nodes.getNode(config._service),
        uaaConfig = RED.nodes.getNode(config._credentials),
        connection;

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function connectToPredix(fn) {
      self.log(JSON.stringify([serviceConfig.url, serviceConfig.predixZoneId]));

      if (connection && connection.connected) {
        fn();
        return;
      }

      uaaConfig.requestAuthToken(function (err, authToken) {
        if (!err){
          client.connect(serviceConfig.url, null, null, headers(authToken.token));
        }
        else{
          self.error(err);
        }
      });

      client.on('connect', function (conn) { onConnectionEstablished(conn); fn(); });
      client.on('connectFailed', processError);
    }

    function onConnectionEstablished (conn) {
      connection = conn;
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
        'Predix-Zone-Id': serviceConfig.predixZoneId
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
