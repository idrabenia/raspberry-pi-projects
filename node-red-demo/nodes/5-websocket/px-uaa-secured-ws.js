'use strict';
var request = require('request');
var ws = require('ws');

var inspect = require("util").inspect;

module.exports = function(RED) {
  "use strict";
  // A node red node that sets up a local websocket server
  function UaaWebSocketListenerNode(n) {
    // Create a RED node
    RED.nodes.createNode(this,n);
    var node = this;

    // Store local copies of the node configuration (as defined in the .html)
    node.path = n.path;
    node.wholemsg = (n.wholemsg === "true");

    node._inputNodes = [];    // collection of nodes that want to receive events
    node._clients = {};
    node.isServer = !/^ws{1,2}:\/\//i.test(node.path);
    node.closing = false;

    node.on("close", function() {
      // Workaround https://github.com/einaros/ws/pull/253
      // Remove listeners from RED.server
      if (node.isServer) {
        var listener = null;
        for (var event in node._serverListeners) {
          if (node._serverListeners.hasOwnProperty(event)) {
            listener = node._serverListeners[event];
            if (typeof listener === "function") {
              RED.server.removeListener(event,listener);
            }
          }
        }
        node._serverListeners = {};
        node.server.close();
        node._inputNodes = [];
      } else {
        node.closing = true;
        node.server.close();
        if (node.tout) { clearTimeout(node.tout); }
      }
    });
  }
  RED.nodes.registerType("px-uaa-secured-ws-listener",UaaWebSocketListenerNode);
  RED.nodes.registerType("px-uaa-secured-ws-client",UaaWebSocketListenerNode);

  UaaWebSocketListenerNode.prototype.registerInputNode = function(/*Node*/handler) {
    this._inputNodes.push(handler);
  };

  UaaWebSocketListenerNode.prototype.removeInputNode = function(/*Node*/handler) {
    this._inputNodes.forEach(function(node, i, inputNodes) {
      if (node === handler) {
        inputNodes.splice(i, 1);
      }
    });
  };

  UaaWebSocketListenerNode.prototype.handleEvent = function(id,/*socket*/socket,/*String*/event,/*Object*/data,/*Object*/flags){
    var msg;
    if (this.wholemsg) {
      try {
        msg = JSON.parse(data);
      }
      catch(err) {
        msg = { payload:data };
      }
    } else {
      msg = {
        payload:data
      };
    }
    msg._session = {type:"websocket",id:id};
    for (var i = 0; i < this._inputNodes.length; i++) {
      this._inputNodes[i].send(msg);
    }
  };

  UaaWebSocketListenerNode.prototype.broadcast = function(data) {
    try {
      if(this.isServer) {
        for (var i = 0; i < this.server.clients.length; i++) {
          this.server.clients[i].send(data);
        }
      }
      else {
        this.server.send(data);
      }
    }
    catch(e) { // swallow any errors
      this.warn("ws:"+i+" : "+e);
    }
  };

  UaaWebSocketListenerNode.prototype.reply = function(id,data) {
    var session = this._clients[id];
    if (session) {
      try {
        session.send(data);
      }
      catch(e) { // swallow any errors
      }
    }
  };

  UaaWebSocketListenerNode.prototype.setConfig = function(config) {
    this.uaa = RED.nodes.getNode(config._credentials);
    this.authorities = config.authorities;
  };

  UaaWebSocketListenerNode.prototype.init = function() {
    var node = this;
    if (node.isServer) {
      var path = RED.settings.httpNodeRoot || "/";
      path = path + (path.slice(-1) == "/" ? "":"/") + (node.path.charAt(0) == "/" ? node.path.substring(1) : node.path);

      // Workaround https://github.com/einaros/ws/pull/253
      // Listen for 'newListener' events from RED.server
      node._serverListeners = {};

      var storeListener = function(event,listener){
        if(event == "error" || event == "upgrade" || event == "listening"){
          node._serverListeners[event] = listener;
        }
      };

      RED.server.addListener('newListener',storeListener);

      // Create a WebSocket Server
      node.server = new ws.Server({
        server:RED.server,
        path:path,
        // Disable the deflate option due to this issue
        //  https://github.com/websockets/ws/pull/632
        // that is fixed in the 1.x release of the ws module
        // that we cannot currently pickup as it drops node 0.10 support
        perMessageDeflate: false
      });

      // Workaround https://github.com/einaros/ws/pull/253
      // Stop listening for new listener events
      RED.server.removeListener('newListener',storeListener);

      node.server.on('connection', handleConnection);
    } else {
      node.closing = false;
      startconn(); // start outbound connection
    }

    function startconn() {    // Connect to remote endpoint
      node.uaa.requestAuthToken(function(err, accessToken) {
        var socket;
        if (err) {
          socket = new ws(node.path);
        } else {
          socket = new ws(node.path, {headers: {
            'authorization': 'Bearer ' + accessToken.token
          }});
        }

        node.server = socket; // keep for closing
        handleConnection(socket);
      });
    }

    function handleConnection(socket) {
      var id = (1+Math.random()*4294967295).toString(16);
      if (node.isServer) {
        node._clients[id] = socket;
      }

      socket.on('open',function() {
        if (!node.isServer) { node.emit('opened',''); }
      });
      socket.on('close',function() {
        if (node.isServer) { delete node._clients[id]; node.emit('closed',Object.keys(node._clients).length); }
        else { node.emit('closed'); }
        if (!node.closing && !node.isServer) {
          node.tout = setTimeout(function(){ startconn(); }, 10); // try to reconnect every 10 msecs... bit fast ?
        }
      });
      socket.on('message',function(data,flags){
        node.handleEvent(id,socket,'message',data,flags);
      });
      socket.on('error', function(err) {
        node.emit('erro', err);
        if (!node.closing && !node.isServer) {
          node.tout = setTimeout(function(){ startconn(); }, 10); // try to reconnect every 10 msecs... bit fast ?
        }
        if (node.isServer) {
          socket.close();
        }
      });
      socket.on('authError', function(err) {
        node.emit('erro', err);
        if (!node.closing && !node.isServer) {
          node.tout = setTimeout(function(){ startconn(); }, 3000);
        }
        if (node.isServer) {
          socket.close();
        }
      });

      if (node.isServer) {
        var tokenCallback = function(err, accessToken) {
          if (err) {
            socket.emit('authError', err);
            return;
          }
          if (!checkAuthorities(node.authorities, accessToken.scope)) {
            socket.emit('authError', {message: 'The client has not required authorities'});
            return;
          }
          node.emit('opened',Object.keys(node._clients).length);
        };

        if (socket.upgradeReq.headers['authorization']) {
          var params = socket.upgradeReq.headers['authorization'].split(' ');
          if (params[0] !== 'Bearer') {
            socket.emit('authError', {message: 'Invalid authorization header'});
            return;
          }
          node.uaa.checkToken(params[1], tokenCallback);
        } else {
          socket.emit('authError', {message: 'Authorization header is not present'});
        }
      }
    }
  };

  function checkAuthorities(expected, available) {
    if (!expected.length) {
      return true;
    }
    var exp = expected.split(' ');
    for (var i in exp) {
      if (available.indexOf(exp[i]) === -1) {
        return false;
      }
    }
    return true;
  }

  function WebSocketInNode(n) {
    RED.nodes.createNode(this,n);
    this.server = (n.client)?n.client:n.server;
    var node = this;

    node.serverConfig = RED.nodes.getNode(node.server);

    if (!node.serverConfig) {
      node.error(RED._("websocket.errors.missing-conf"));
    } else {
      node.serverConfig.setConfig(n);
      node.serverConfig.init();
      node.serverConfig.registerInputNode(node);
      node.serverConfig.on('opened', function(n) { node.status({fill:"green",shape:"dot",text:"connected "+n}); });
      node.serverConfig.on('erro', function(err) {
        node.error(err);
        node.status({fill:"red",shape:"ring",text:"error"});
      });
      node.serverConfig.on('closed', function() { node.status({fill:"red",shape:"ring",text:"disconnected"}); });
    }

    node.on('close', function() {
      node.serverConfig.removeInputNode(node);
    });

  }
  RED.nodes.registerType("px-uaa-secured-ws-inbound",WebSocketInNode);

  function WebSocketOutNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.server = (n.client)?n.client:n.server;
    node.serverConfig = RED.nodes.getNode(this.server);
    if (!node.serverConfig) {
      node.error(RED._("websocket.errors.missing-conf"));
    }
    else {
      node.serverConfig.setConfig(n);
      node.serverConfig.init();
      node.serverConfig.on('opened', function(n) { node.status({fill:"green",shape:"dot",text:"connected "+n}); });
      node.serverConfig.on('erro', function() { node.status({fill:"red",shape:"ring",text:"error"}); });
      node.serverConfig.on('closed', function() { node.status({fill:"red",shape:"ring",text:"disconnected"}); });
    }
    node.on("input", function(msg) {
      var payload;
      if (node.serverConfig.wholemsg) {
        delete msg._session;
        payload = JSON.stringify(msg);
      } else if (msg.hasOwnProperty("payload")) {
        if (!Buffer.isBuffer(msg.payload)) { // if it's not a buffer make sure it's a string.
          payload = RED.util.ensureString(msg.payload);
        } else {
          payload = msg.payload;
        }
      }
      if (payload) {
        if (msg._session && msg._session.type == "websocket") {
          node.serverConfig.reply(msg._session.id,payload);
        } else {
          node.serverConfig.broadcast(payload,function(error){
            if (!!error) {
              node.warn(RED._("websocket.errors.send-error")+inspect(error));
            }
          });
        }
      }
    });
  }
  RED.nodes.registerType("px-uaa-secured-ws-outbound",WebSocketOutNode);
};
