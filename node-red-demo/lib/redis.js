var when = require('when');
var redis = require('redis');

var VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
var VCAP_APPLICATION = JSON.parse(process.env.VCAP_APPLICATION);
var APPLICATION_ID = VCAP_APPLICATION.application_id;

// TODO AS: Depending on a plan - type of the service might be different
var serviceSettings = VCAP_SERVICES['redis-1'][0]['credentials']

var client;

var init = function(settings) {
  var creds = {
    host: serviceSettings['host'],
    port: serviceSettings['port'],
    password: serviceSettings['password']
  };

  client = redis.createClient(creds);
};

var save = function(key, content) {
  return when.promise(function(resolve, reject) {
    return client.set(APPLICATION_ID + key, JSON.stringify(content), function(err, data) {
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
    return client.get(APPLICATION_ID + key, function(err, data) {
      if (err) {
        resolve(defaultValue);
      } else {
        resolve(data ? JSON.parse(data.toString()) : defaultValue);
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
