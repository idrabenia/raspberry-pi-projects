'use strict';
var request = require('request');
var url = require('url');

module.exports = function(RED) {
  function PxUaaSecuredHttp(configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials);

    function init() {
      RED.nodes.createNode(self, config);
      self.on('input', processInput);
    }

    function processInput(msg) {
      uaaConfig.requestAuthToken(function (err, authToken) {
        if (err) {
          node.error(err);
          return;
        }

        var opts = {
          method: config.method,
          headers: headers(authToken.token),
          uri: config.endpoint,
          body: stringify(msg.payload)
        };

        if (config.method === 'GET') {
          opts.qs = msg.payload;
        }

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

    function stringify(data) {
      if (typeof data !== 'string') {
        return JSON.stringify(data);
      } else {
        return data;
      }
    }

    function headers (authToken) {
      var headers = {
        Authorization: 'Bearer $token'.replace('$token', authToken),
        'Content-Type': 'application/json'
      };
      headers[config.predixZoneHeaderName || 'Predix-Zone-Id'] = config.predixZoneId;
      return headers;
    }

    init ();
  }

  RED.nodes.registerType("px-uaa-secured-http", PxUaaSecuredHttp);
};
