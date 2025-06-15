'use strict';
var request = require('request');
var Promise = require('bluebird');

module.exports = function(RED) {
  function PxUaaConfig(config) {
    var self = this,
        timeout = 10 * 60 * 1000,
        tokenCache = {};

    function init() {
      RED.nodes.createNode(self, config);
      //self.context().flow.tokenCache = {};
    }

    self.requestAuthToken = function (fn) {
      if (self.isTokenValid(config.clientId)) {
        return fn(null, self.getToken(config.clientId));
      }

      var urlTemplate = '$url/oauth/token' +
        '?grant_type=client_credentials' +
        '&client_id=$id' +
        '&client_secret=$secret';

      var url = urlTemplate
        .replace('$url', config.uaaUrl)
        .replace('$id', config.clientId)
        .replace('$secret', config.clientSecret);

      request
        .get(url, function(err, response, body) {
          err && self.log(err);
          var token = JSON.parse(body);
          if (token.error) {
            return fn(token);
          }
          !err && fn && fn(null, self.updateToken(config.clientId, token));
        })
        .auth(config.clientId, config.clientSecret);
    };

    self.requestAuthTokenPromise = function () {
      return new Promise(function (resolve, reject) {

        self.requestAuthToken(function (err, token) {
          if (!err) {
            resolve(token.token);
          } else {
            reject(err);
          }
        });

      });
    };

    self.isTokenValid = function(clientId) {
      return tokenCache[clientId] &&
          tokenCache[clientId].expiresIn >= new Date().getTime();
    };

    self.updateToken = function(clientId, token) {
      var tokenObj = {
        token: token.access_token,
        expiresIn: new Date().getTime()+timeout,
        scope: token.scope,
        client_id: clientId
      };
      tokenCache[clientId] = tokenObj;

      return tokenObj;
    };

    self.getToken = function(clientId) {
      return tokenCache[clientId];
    };

    self.checkToken = function(token, fn) {
      var urlTemplate = '$url/check_token';

      var url = urlTemplate
          .replace('$url', config.uaaUrl);

      var opts = {
        method: 'POST',
        uri: url,
        body: 'token=' + token,
        headers: {'Content-type': 'application/x-www-form-urlencoded'}
      };

      request(opts, function(err, response, body) {
          err && self.error(err);
          var res = JSON.parse(body);
          if (res.error) {
            return fn(res, null);
          }
          fn(null, self.updateToken(res.client_id, {access_token: token, scope: res.scope}));
        })
        .auth(config.clientId, config.clientSecret);
    };

    init ();
  }

  RED.nodes.registerType("px-uaa-config", PxUaaConfig);
};
