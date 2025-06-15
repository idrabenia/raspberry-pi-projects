'use strict';
var request = require('request');
var url = require('url');
var redRegistry = require('node-red/red/runtime/nodes/registry');

module.exports = function (RED) {

  function PxAssetsModify (config) {
    var self = this,
        uaaConfig = RED.nodes.getNode(config._credentials),
        assets = RED.nodes.getNode(config.service),
        funcNodeConstructor = redRegistry.get('function'),
        funcNodeConfig = { func: config.queryFunc };

    function init () {
      // Use existing artificial function node to avoid code duplication and
      // inconsistency.
      var funcNode = new funcNodeConstructor(funcNodeConfig);
      // Override artificial node output to just trigger processInput
      funcNode.send = function (data) {
        // Node red function expects data to be in payload key.
        // We don't so we have to clean objects of messaging data after it.
        if (data instanceof Array) {
          data.forEach(function(msg) { delete msg._msgid; });
        } else if (data) {
          delete data._msgid;
        }

        processInput({ payload: data });
      };

      self.queryFunc = config.queryFunc;
      RED.nodes.createNode(self, config);

      self.on('input', function(msg) {
        // Redirecting the call to the function stub-node
        funcNode.receive(msg);
      });
    }

    function processInput (msg) {
      uaaConfig
        .requestAuthTokenPromise()
        .then(function (token) {
          var model = getModel(msg.payload);
          var data = toArray(msg.payload);

          if (config.mode === 'create') {
            return assets.create(token, model.path, data);
          } else if (config.mode === 'update') {
            return assets.update(token, model.path + '/' + model.id, data);
          } else {
            return assets.delete(token, model.path  + '/' + model.id);
          }

        })
        .then(function (body) {
          self.log(body);
        })
        .catch(function (err) {
          self.error(err);
        });
    }

    // TODO: seems like logic is not correct
    function getModel(data) {
      if (data instanceof Array && data.length) {
        data = data[0];
      }

      var path = data.uri.split('/');
      return {
        path: path[1],
        id: path[2]
      };
    }

    function toArray(data) {
      if (!(data instanceof Array)) {
        return [data];
      } else {
        return data;
      }
    }

    init ();
  }

  RED.nodes.registerType("px-assets-modify", PxAssetsModify);
};
