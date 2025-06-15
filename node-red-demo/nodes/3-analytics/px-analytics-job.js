var request = require('request');

module.exports = function (RED) {

  function PxAnalyticsJob (configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials);

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function processInput (msg) {
      var inputData = msg.payload;
      uaaConfig.requestAuthToken(function (err, authToken) {
        var reqHeaders = headers(authToken.token);
        var getAnalyticsOpts = {
          method: 'GET',
          uri: "$url/api/v1/catalog/analytics".replace('$url', config.url),
          headers: reqHeaders,
          qs: {
            taxonomyPath: config.taxonomy || '',
            size: 100 //TODO choose optimum size
          }
        };

        request(getAnalyticsOpts, function(err, response, body) {
          if (err) {
            self.error(err);
          }

          var jobs = JSON.parse(body).analyticCatalogEntries;

          if (jobs.length === 0) {
            self.send({message: 'Cannot find a job with name ' + config.jobName});
          }

          var jobId = jobs[0].id;

          var executionJobOpts = {
            method: 'POST',
            uri: "$url/api/v1/catalog/analytics/$id/execution"
                .replace('$url', config.url)
                .replace('$id', jobId),
            headers: reqHeaders,
            body: stringify(inputData)
          };

          request(executionJobOpts, function(err, response, body) {
            if (!err && body) {
              msg.payload = JSON.parse(body).result;
              self.send(msg);
            } else {
              self.error(err);
            }
          })
        });
      });
    }

    function headers (authToken) {
      return {
        Authorization: 'Bearer $token'.replace('$token', authToken),
        'Predix-Zone-Id': config.predixZoneId,
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

  RED.nodes.registerType("px-analytics-job", PxAnalyticsJob);
};
