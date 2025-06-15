var runningInCloud = process.env.VCAP_APPLICATION ? true : false;

module.exports = {
  // Default storage module
  // storageModule: require('node-red/red/runtime/storage/localfilesystem'),

  // Blackhole storage module
  // storageModule: require('./lib/blackhole'),

  // S3 storage module
  // storageModule: require('./lib/s3'),

  // Redis storage module
  storageModule: runningInCloud ? require('./lib/redis') : require('node-red/red/runtime/storage/localfilesystem'),

  // TCP Port for the Web Dashboard
  uiPort: process.env.VCAP_APP_PORT || 1880,

  // Default folder to load nodes from:
  nodesDir: process.cwd() + '/nodes'
};
