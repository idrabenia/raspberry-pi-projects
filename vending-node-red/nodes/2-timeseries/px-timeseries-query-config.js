module.exports = function(RED) {
  function PxTimeseriesConfig(config) {
      RED.nodes.createNode(this, config);
      var urlTemplate = '$url/v1/datapoints';
      this.url = urlTemplate.replace('$url', config.url);
      this.predixZoneId = config.predixZone;
  }
  RED.nodes.registerType("px-timeseries-query-config", PxTimeseriesConfig);
}