'use strict';
var request = require('request');
var url = require('url');

module.exports = function (RED) {

  function PxAssetsModify (configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials),
        assets = RED.nodes.getNode(config.service);

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function processInput (msg) {
      uaaConfig
        .requestAuthTokenPromise()
        .then(function (token) {
          var model = getModel(msg.payload);
          var data = toArray(msg.payload);

          if (config.mode === 'create') {
            return assets.create(token, model.path, data);
          } else if (config.mode === 'update'){
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
