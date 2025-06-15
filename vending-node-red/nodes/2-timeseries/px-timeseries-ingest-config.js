module.exports = function(RED) {
  function PxTimeseriesConfig(config) {
      RED.nodes.createNode(this, config);
      var urlTemplate = '$url/v1/stream/messages';
      this.url = urlTemplate.replace('$url', config.url);
      this.predixZoneId = config.predixZone;
  }
  RED.nodes.registerType("px-timeseries-ingest-config", PxTimeseriesConfig);
}