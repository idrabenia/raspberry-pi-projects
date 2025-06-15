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
      var grant_type = 'client_credentials';
      var clientId = config.clientId;
      var clientSecret = config.clientSecret;

      if (self.isTokenValid(clientId)) {
        return fn(null, self.getToken(clientId));
      }

      var urlComponents = {
        'url': config.uaaUrl,
        'grant_type': grant_type,
        'id': clientId,
        'secret': clientSecret
      };
      var url = composeUrl(basicTokenUrlTemplate(), urlComponents);

      request
        .get(url, function(err, response, body) {
          err && self.log(err);
          var token = isJsonString(body) && JSON.parse(body);
          if (token && token.error) {
            self.log(token);
            return fn(token);
          }
          !err && fn && fn(null, self.updateToken(clientId, token));
        })
        .auth(clientId, clientSecret);
    };

    self.requestUserAuthToken = function (fn, options) {
      var grant_type = 'password';
      var clientId = config.clientId;
      var clientSecret = config.clientSecret;

      var urlTemplate = basicTokenUrlTemplate() +
        '&username=$username' +
        '&password=$password';
      var urlComponents = {
        'url': config.uaaUrl,
        'grant_type': grant_type,
        'id': clientId,
        'secret': clientSecret,
        'username': options.username,
        'password': options.password
      };
      var url = composeUrl(urlTemplate, urlComponents);

      request
        .get(url, function(err, response, body) {
          err && self.log(err);
          var token = isJsonString(body) && JSON.parse(body);
          if (token && token.error) {
            self.log(token);
            return fn(token);
          }
          !err && fn && fn(null, toTokenObj(clientId, token));
        })
        .auth(clientId, clientSecret);
    };

    function isJsonString(str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }

      return true;
    }

    function toTokenObj(clientId, token){
      var tokenObj = {
        token: token.access_token,
        expiresIn: new Date().getTime()+timeout,
        scope: token.scope,
        client_id: clientId
      };
      return tokenObj;
    };

    self.getClientId = function(){
      return config.clientId;
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
      var tokenObj = toTokenObj(clientId, token);
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

    self.getUser = function(username, password, fn) {
      var options = { username: username, password: password, grant_type: 'password' };

      self.requestUserAuthToken(function (err, authToken) {
        if (err) {
          return fn(err, null);
        }
        else {
          var token = authToken.token;
          self.getUserInfo(token, function (err, userInfo) {
            if (err)
              return fn(err, null);
            else {
              var urlTemplate = '$url/Users/$userId';
              var urlComponents = {
                'url': config.uaaUrl,
                'userId': userInfo.user_id
              };
              return makeRequest(fn, token, urlTemplate, urlComponents);
            }
          });
        }
      }, options);
    };

    self.getUserInfo = function(token, fn) {
      var urlTemplate = '$url/userinfo';
      var urlComponents = {'url': config.uaaUrl};
      return makeRequest(fn, token, urlTemplate, urlComponents);
    };

    function makeRequest(fn, token, urlTemplate, urlComponents){
      var url = composeUrl(urlTemplate, urlComponents);

      var opts = {
        method: 'GET',
        uri: url,
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer $token'.replace('$token', token),
        }
      };

      request(opts, function(err, response, body) {
        if (err)
          return fn(err, null);
        var res = JSON.parse(body);
        if (res.error) {
          return fn(res, null);
        }
        return fn(null, res);
      });
    };

    init ();
  };

  // URL functions

  function basicTokenUrlTemplate(){
    var urlTemplate = '$url/oauth/token' +
      '?grant_type=$grant_type' +
      '&client_id=$id' +
      '&client_secret=$secret';
    return urlTemplate;
  };

  function composeUrl(urlTemplate, urlComponents){
    var url = urlTemplate;
    for (var key in urlComponents) {
      url = url.replace('$' + key, urlComponents[key]);
    }
    return url;
  };

  RED.nodes.registerType("px-uaa-config", PxUaaConfig);
};
