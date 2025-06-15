// This storage module doesn't actually save anything,
// but it complies to a minimum storage API interface
// and allows Node RED to launch successfully

// The order of execution
// * init
// * getSettings (Promise -> JSON)
// * getFlows (Promise -> Array)
// * getCredentials (Promise -> JSON)
// * getLibraryEntry("flows", path) (Promise -> Array)

var when = require('when');

var init = function(settings) {

};

var getFlows = function() {
  return when.promise(function(resolve, reject) {
    resolve([]);
  });
};

var saveFlows = function(flows) {

};

var getCredentials = function() {
  return when.promise(function(resolve, reject) {
    resolve({});
  });
};

var saveCredentials = function(credentials) {

};

var getSettings = function() {
  return when.promise(function(resolve, reject) {
    resolve({});
  });
};

var saveSettings = function(settings) {

};

var getSessions = function() {

};

var saveSessions = function(sessions) {

};

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
