'use strict';

module.exports = function (RED) {

  function PxAssetsQuery (configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials),
        assets = RED.nodes.getNode(config.service);

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function processInput (msg) {
      var query = msg.payload;

      uaaConfig
        .requestAuthTokenPromise()
        .then(function (token) {
          return assets.query(token, config.model, query);
        })
        .then(function (body) {
          msg.payload = JSON.parse(body);
          self.send(msg);
        })
        .catch(function (err) {
          self.error(err);
        });
    }

    init ();
  }

  RED.nodes.registerType("px-assets-query", PxAssetsQuery);
};
