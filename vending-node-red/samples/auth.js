var qs = require('querystring');
var url = require('url');
var request = require('request');

module.exports = {
  init: function (options) {
    options = options ;
    this.clientId = options.clientId ;
    this.serverUrl = options.serverUrl;
    this.defaultClientRoute = options.defaultClientRoute ;
    this.base64ClientCredential = options.base64ClientCredential ;
    this.user = null;
    this.callbackUrl = options.callbackUrl;
    this.appUrl = options.appUrl;
  },
  getAccessTokenFromCode: function (authCode, successCallback, errorCallback) {
    var request = require('request');
    var self = this;
    var options = {
      method: 'POST',
      url: this.serverUrl + '/oauth/token',
      form: {
        'grant_type': 'authorization_code',
        'code': authCode,
        'redirect_uri': this.callbackUrl,
        'state': this.defautClientRoute
      },
      headers: {
        'Authorization': 'Basic ' + this.base64ClientCredential
      }
    };

    request(options, function (err, response, body) {
      if (!err && response.statusCode == 200) {
        var res = JSON.parse(body);
        var accessToken = res.token_type + ' ' + res.access_token;
        //get user info
        request({
          method: 'post',
          url: self.serverUrl + '/check_token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + self.base64ClientCredential
          },
          form: {
            'token': res.access_token
          }
        }, function (error, response, body) {
          self.user = JSON.parse(body);
          var res = JSON.parse(body);
          var accessToken = res.token_type + ' ' + res.access_token;
          successCallback(accessToken);
	});
      }
      else {
        errorCallback(body);
      }
    });
  }
};

var Auth = module.exports;

var auth = Auth.init({
  clientId: 'mvp3_ref_app',
  serverUrl: 'https://8ba3b6e3-712f-4de5-b6cd-248e6b370507.predix-uaa.run.aws-usw02-pr.ice.predix.io',
  defaultClientRoute: 'http://localhost',
  base64ClientCredential: '4oCTbiBtdnAzX3JlZl9hcHA6bXZwM3JlZkBwcAo=',
});
