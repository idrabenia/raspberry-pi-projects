var when = require('when');
var AWS = require('aws-sdk');

var VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
var VCAP_APPLICATION = JSON.parse(process.env.VCAP_APPLICATION);

var serviceSettings = VCAP_SERVICES['predix-blobstore'][0]['credentials']

var client;

var init = function(settings) {
  var creds = {
    accessKeyId: serviceSettings['access_key_id'],
    secretAccessKey: serviceSettings['secret_access_key'],
    endpoint: 's3-us-west-2.amazonaws.com', // TODO AS: serviceSettings['url'],
    sslEnabled: true,
    signatureVersion: 'v4',
    params: { Bucket: 'bucket-6a442643-d656-4b10-8993-b3c0dbe603ed' } // TODO AS: serviceSettings['url']
  };

  client = new AWS.S3(creds);
};

var save = function(key, content) {
  return when.promise(function(resolve, reject) {
    return client.putObject({
      Key: key,
      Body: JSON.stringify(content),
      ACL: 'private'
    }, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

var load = function(key, defaultValue) {
  return when.promise(function(resolve, reject) {
    return client.getObject({
      Key: key
    }, function(err, data) {
      if (err) {
        resolve(defaultValue);
      } else {
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
};

var getFlows = function() {
  return load('flows.json', []);
};

var saveFlows = function(flows) {
  return save('flows.json', flows);
};

var getCredentials = function() {
  return load('credentials.json', {});
};

var saveCredentials = function(credentials) {
  return save('credentials.json', credentials);
};

var getSettings = function() {
  return load('settings.json', {});
};

var saveSettings = function(settings) {
  return save('settings.json', settings);
};

var getSessions = function() {
  return load('sessions.json', []); // TODO AS: Not sure about this one
};

var saveSessions = function(sessions) {
  return save('sessions.json', sessions);
};

// TODO AS: Not sure about these two
// Everything seems to work without them
var getLibraryEntry = function(type, path) {
  return when.promise(function(resolve, reject) {
    resolve([]);
  });
};

var saveLibraryEntry = function(type, path, meta, body) {

};

var storageModule = {
  init: init,
  getFlows: getFlows,
  saveFlows: saveFlows,
  getCredentials: getCredentials,
  saveCredentials: saveCredentials,
  getSettings: getSettings,
  saveSettings: saveSettings,
  getSessions: getSessions,
  getLibraryEntry: getLibraryEntry,
  saveLibraryEntry: saveLibraryEntry
};

module.exports = storageModule;
