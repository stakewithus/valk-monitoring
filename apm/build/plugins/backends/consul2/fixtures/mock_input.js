"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* eslint-disable */
var svcDef = JSON.parse("\n{\n  \"ID\": \"bcl-commit-hub\",\n  \"Name\": \"bcl-commit-hub\",\n  \"Address\": \"127.0.0.1\",\n  \"Port\": 46656,\n  \"Meta\": {\n    \"node-project\": \"blockchain-client\",\n    \"node-project-category\": \"tendermint\",\n    \"node-project-name\": \"commit-hub\"\n  },\n  \"Checks\": [\n    {\n      \"Name\": \"http-rpc-alive\",\n      \"Notes\": \"Checks that Tendermint RPC Server is running\",\n      \"HTTP\": \"http://127.0.0.1:46657/status\",\n      \"Method\": \"GET\",\n      \"Interval\": \"3s\",\n      \"ServiceID\": \"bcl-commit-hub\",\n      \"Status\": \"critical\"\n    },\n    {\n      \"Name\": \"tcp-p2p-alive\",\n      \"Notes\": \"Checks that Tendermint P2P Server is running\",\n      \"TCP\": \"127.0.0.1:46656\",\n      \"Interval\": \"3s\",\n      \"ServiceID\": \"bcl-commit-hub\",\n      \"Status\": \"critical\"\n    },\n    {\n      \"Name\": \"tm-missed-blocks\",\n      \"Notes\": \"Tally for monitoring missed blocks threshold\",\n      \"TTL\": \"5s\",\n      \"ServiceID\": \"bcl-commit-hub\",\n      \"Status\": \"critical\"\n    },\n    {\n      \"Name\": \"tm-late-block-time\",\n      \"Notes\": \"Tally for late block time threshold\",\n      \"TTL\": \"5s\",\n      \"ServiceID\": \"bcl-commit-hub\",\n      \"Status\": \"critical\"\n    },\n    {\n      \"Name\": \"tm-peer-count\",\n      \"Notes\": \"Tally for peer count threshold\",\n      \"TTL\": \"5s\",\n      \"ServiceID\": \"bcl-commit-hub\",\n      \"Status\": \"critical\"\n    }\n  ]\n}\n");
/* eslint-enable */
exports.default = {
  svcDef: svcDef
};
//# sourceMappingURL=mock_input.js.map
