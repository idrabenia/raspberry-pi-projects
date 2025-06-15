'use strict';
var request = require('request');

module.exports = function (RED) {

  function PxTimeseriesQuery (configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials);

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function processInput (msg) {
      uaaConfig.requestAuthToken(function (err, authToken) {
        if (err) {
          return self.error(err);
        }
        var opts = {
          method: 'POST',
          uri: "$url/v1/datapoints".replace('$url', config.url),
          headers: headers(authToken.token),
          body: toJson(msg.payload)
        };

        request(opts, function(err, response, body) {
          if (!err && body) {
            msg.payload = JSON.parse(body);
            self.send(msg);
          } else {
            self.error(err);
          }
        });
      });
    }

    function headers (authToken) {
      return {
        Authorization: 'Bearer $token'.replace('$token', authToken),
        'Predix-Zone-Id': config.predixZoneId,
        'Content-Type': 'application/json'
      };
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

  RED.nodes.registerType("px-timeseries-query", PxTimeseriesQuery);
};
