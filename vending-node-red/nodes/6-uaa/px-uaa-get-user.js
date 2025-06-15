'use strict';
module.exports = function (RED) {
  function PxUaaGetUser (configVal) {
    var self = this,
        config = configVal,
        uaaConfig = RED.nodes.getNode(config._credentials),
        clientId = uaaConfig.getClientId();

    function init () {
      RED.nodes.createNode(self, config);

      self.on('input', processInput);
    }

    function processInput (msg) {
      var username = msg.payload.username;
      var password = msg.payload.password;

      uaaConfig.getUser(username, password, function (err, user) {
        user.clientId = clientId;
        if (err) {
           var result = err;
        }
        else {
          var result = user;
        }
        msg.payload = result;
        self.send(msg);
      });
    }

    init ();
  }

  RED.nodes.registerType("px-uaa-get-user", PxUaaGetUser);
};
