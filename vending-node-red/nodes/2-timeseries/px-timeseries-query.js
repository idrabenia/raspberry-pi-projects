'use strict';
var request = require('request');

module.exports = function (RED) {

  function PxTimeseriesQuery (configVal) {
    var self = this,
        config = configVal,
        serviceConfig = RED.nodes.getNode(config._service),
        uaaConfig = RED.nodes.getNode(config._credentials),
        queryFunction = config.queryFunc ? config.queryFunc : "return msg.payload;";

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', function(msg) {
        // Creates a new function with the insctructions in "query function"
        var F = new Function('msg', queryFunction);
        var transformedMsg = { payload: F(msg) };
        processInput(transformedMsg);
      });
    }

    function processInput (msg) {
      uaaConfig.requestAuthToken(function (err, authToken) {
        if (err) {
          return self.error(err);
        }
        var opts = {
          method: 'POST',
          uri: serviceConfig.url,
          headers: headers(authToken.token),
          body: toJson(msg.payload)
        };

        self.log(JSON.stringify([opts]));

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
        'Predix-Zone-Id': serviceConfig.predixZoneId,
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
