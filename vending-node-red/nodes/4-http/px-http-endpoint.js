'use strict';
var request = require('request');

module.exports = function(RED) {
  "use strict";
  var bodyParser = require("body-parser");
  var getBody = require('raw-body');
  var cors = require('cors');
  var jsonParser = bodyParser.json();
  var urlencParser = bodyParser.urlencoded({extended:true});
  var onHeaders = require('on-headers');
  var typer = require('media-typer');
  var isUtf8 = require('is-utf8');

  function rawBodyParser(req, res, next) {
    if (req._body) { return next(); }
    req.body = "";
    req._body = true;

    var isText = true;
    var checkUTF = false;

    if (req.headers['content-type']) {
      var parsedType = typer.parse(req.headers['content-type']);
      if (parsedType.type === "text") {
        isText = true;
      } else if (parsedType.subtype === "xml" || parsedType.suffix === "xml") {
        isText = true;
      } else if (parsedType.type !== "application") {
        isText = false;
      } else if (parsedType.subtype !== "octet-stream") {
        checkUTF = true;
      }
    }

    getBody(req, {
      length: req.headers['content-length'],
      encoding: isText ? "utf8" : null
    }, function (err, buf) {
      if (err) { return next(err); }
      if (!isText && checkUTF && isUtf8(buf)) {
        buf = buf.toString()
      }

      req.body = buf;
      next();
    });
  }

  function createResponseWrapper(node,res) {
    var wrapper = {
      _res: res
    };
    var toWrap = [
      "append",
      "attachment",
      "cookie",
      "clearCookie",
      "download",
      "end",
      "format",
      "get",
      "json",
      "jsonp",
      "links",
      "location",
      "redirect",
      "render",
      "send",
      "sendfile",
      "sendFile",
      "sendStatus",
      "set",
      "status",
      "type",
      "vary"
    ];
    toWrap.forEach(function(f) {
      wrapper[f] = function() {
        node.warn(RED._("httpin.errors.deprecated-call",{method:"msg.res."+f}));
        var result = res[f].apply(res,arguments);
        if (result === res) {
          return wrapper;
        } else {
          return result;
        }
      }
    });
    return wrapper;
  }

  var corsHandler = function(req,res,next) { next(); };

  if (RED.settings.httpNodeCors) {
    corsHandler = cors(RED.settings.httpNodeCors);
    RED.httpNode.options("*",corsHandler);
  }

  function PxUaaSecuredHttpInbound(n) {
    RED.nodes.createNode(this,n);
    var uaaConfig = RED.nodes.getNode(n._credentials);

    if (RED.settings.httpNodeRoot !== false) {
      if (!n.url) {
        this.warn(RED._("httpin.errors.missing-path"));
        return;
      }
      this.url = n.url;
      this.method = n.method;

      var node = this;

      this.errorHandler = function(err,req,res,next) {
        node.warn(err);
        res.sendStatus(500);
      };

      this.callback = function(req,res) {
        var msgid = RED.util.generateId();
        res._msgid = msgid;
        if (node.method.match(/(^post$|^delete$|^put$|^options$|^patch$)/)) {
          node.send({_msgid:msgid,req:req,res:createResponseWrapper(node,res),payload:req.body});
        } else if (node.method === "get") {
          node.send({_msgid:msgid,req:req,res:createResponseWrapper(node,res),payload:req.query});
        } else {
          node.send({_msgid:msgid,req:req,res:createResponseWrapper(node,res)});
        }
      };

      var httpMiddleware = function(req,res,next) { next(); };

      if (RED.settings.httpNodeMiddleware) {
        if (typeof RED.settings.httpNodeMiddleware === "function") {
          httpMiddleware = RED.settings.httpNodeMiddleware;
        }
      }

      var metricsHandler = function(req,res,next) { next(); };

      if (this.metric()) {
        metricsHandler = function(req, res, next) {
          var startAt = process.hrtime();
          onHeaders(res, function() {
            if (res._msgid) {
              var diff = process.hrtime(startAt);
              var ms = diff[0] * 1e3 + diff[1] * 1e-6;
              var metricResponseTime = ms.toFixed(3);
              var metricContentLength = res._headers["content-length"];
              //assuming that _id has been set for res._metrics in HttpOut node!
              node.metric("response.time.millis", {_msgid:res._msgid} , metricResponseTime);
              node.metric("response.content-length.bytes", {_msgid:res._msgid} , metricContentLength);
            }
          });
          next();
        };
      }

      var authHandler = function(req, res, next) {
        var tokenCallback = function(err, accessToken) {
          if (err) {
            res.status(401).send(err);
          }
          if (!checkAuthorities(n.authorities, accessToken.scope)) {
            res.status(401).send({message: 'The client has not required authorities'});
          }
          next();
        };

        if (req.headers['authorization']) {
          var params = req.headers['authorization'].split(' ');
          if (params[0] !== 'Bearer') {
            return node.err('Invalid authorization header');
          }
          uaaConfig.checkToken(params[1], tokenCallback);
        } else {
          res.status(401).send({message: 'Authorization header is not present'});
        }
      };

      if (this.method === "get") {
        RED.httpNode.get(this.url,authHandler,httpMiddleware,corsHandler,metricsHandler,this.callback,this.errorHandler);
      } else if (this.method === "post") {
        RED.httpNode.post(this.url,authHandler,httpMiddleware,corsHandler,metricsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
      } else if (this.method === "put") {
        RED.httpNode.put(this.url,authHandler,httpMiddleware,corsHandler,metricsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
      } else if (this.method === "delete") {
        RED.httpNode.delete(this.url,authHandler,httpMiddleware,corsHandler,metricsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
      } else if (this.method === "patch") {
        RED.httpNode.patch(this.url,authHandler,httpMiddleware,corsHandler,metricsHandler,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
      }

      this.on("close",function() {
        var node = this;
        RED.httpNode._router.stack.forEach(function(route,i,routes) {
          if (route.route && route.route.path === node.url && route.route.methods[node.method]) {
            routes.splice(i,1);
          }
        });
      });
    } else {
      this.warn(RED._("httpin.errors.not-created"));
    }
  }

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

  RED.nodes.registerType("px-uaa-secured-http-inbound", PxUaaSecuredHttpInbound);
};
