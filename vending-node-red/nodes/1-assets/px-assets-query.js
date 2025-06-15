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
      var queryMessage = config.query == "" ? msg.payload : config.query;
      var query = parseJsonQuery(queryMessage);

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

  function parseJsonQuery(queryMessage) {
    try {
      //convert to JSON unless it is already JSON
      var configQuery = typeof(queryMessage) == "object" ? queryMessage : JSON.parse(queryMessage);
      var query = {};
      if (configQuery.fields)
        query.fields = configQuery.fields;
      if (configQuery.pageSize)
        query.pageSize = configQuery.pageSize;
      if (configQuery.filter)
        query.filter = configQuery.filter;
    } catch (e) {
      throw("Parse Error Invalid query.");
    }
    return query;
  }

  RED.nodes.registerType("px-assets-query", PxAssetsQuery);
};
