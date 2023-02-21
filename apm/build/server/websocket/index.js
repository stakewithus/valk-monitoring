'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wsSend = function wsSend(client) {
  return function (type, payload) {
    return new _promise2.default(function (resolve, reject) {
      var msg = {
        type: type,
        data: payload
      };
      client.send((0, _stringify2.default)(msg), function (err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  };
};

var broadcast = function broadcast(wss) {
  return function (type, message) {
    wss.clients.forEach(async function (client) {
      if (client.readyState === _ws2.default.OPEN) {
        try {
          wsSend(client)(type, message);
        } catch (err) {
          console.log('broadcastBlocks error');
          console.log(err && err.toString());
        }
      }
    });
  };
};

exports.default = {
  broadcast: broadcast
};
//# sourceMappingURL=index.js.map
