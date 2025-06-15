'use strict';
var request = require('request-promise');
var url = require('url');

module.exports = function(RED) {
  function PxAssetsService(config) {
    var self = this;

    function init() {
      self.url = config.url;
      self.predixZoneId = config.predixZoneId;

      RED.nodes.createNode(self, config);
    }

    self.query = function (token, model, query) {
      var assetsUrl = url.parse(self.url);

      var modelUrl = url.format({
        protocol: assetsUrl.protocol,
        host: assetsUrl.host,
        pathname: model,
        query: query
      });

      return request({
        method: 'GET',
        uri: url.parse(modelUrl),
        headers: headers(token)
      });
    };

    self.create = function (token, modelPath, data) {
      return request({
        method: 'POST',
        headers: headers(token),
        uri: self.url + '/' + modelPath,
        body: stringify(data)
      });
    };

    self.update = function (token, modelPath, data) {
      return request({
        method: 'PUT',
        headers: headers(token),
        uri: self.url + '/' + modelPath,
        body: stringify(data)
      });
    };

    self.delete = function (token, modelPath) {
      return request({
        method: 'DELETE',
        headers: headers(token),
        uri: self.url + '/' + modelPath
      });
    };

    function headers (authToken) {
      return {
        Authorization: 'Bearer $token'.replace('$token', authToken),
        'Predix-Zone-Id': self.predixZoneId,
        'Content-Type': 'application/json'
      };
    }

    function stringify(data) {
      if (typeof data !== 'string') {
        return JSON.stringify(data);
      } else {
        return data;
      }
    }

    init ();
  }

  RED.nodes.registerType("px-assets-service-config", PxAssetsService);
};
