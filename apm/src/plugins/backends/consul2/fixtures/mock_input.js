/* eslint-disable */
const svcDef = JSON.parse(`
{
  "ID": "bcl-commit-hub",
  "Name": "bcl-commit-hub",
  "Address": "127.0.0.1",
  "Port": 46656,
  "Meta": {
    "node-project": "blockchain-client",
    "node-project-category": "tendermint",
    "node-project-name": "commit-hub"
  },
  "Checks": [
    {
      "Name": "http-rpc-alive",
      "Notes": "Checks that Tendermint RPC Server is running",
      "HTTP": "http:\/\/127.0.0.1:46657\/status",
      "Method": "GET",
      "Interval": "3s",
      "ServiceID": "bcl-commit-hub",
      "Status": "critical"
    },
    {
      "Name": "tcp-p2p-alive",
      "Notes": "Checks that Tendermint P2P Server is running",
      "TCP": "127.0.0.1:46656",
      "Interval": "3s",
      "ServiceID": "bcl-commit-hub",
      "Status": "critical"
    },
    {
      "Name": "tm-missed-blocks",
      "Notes": "Tally for monitoring missed blocks threshold",
      "TTL": "5s",
      "ServiceID": "bcl-commit-hub",
      "Status": "critical"
    },
    {
      "Name": "tm-late-block-time",
      "Notes": "Tally for late block time threshold",
      "TTL": "5s",
      "ServiceID": "bcl-commit-hub",
      "Status": "critical"
    },
    {
      "Name": "tm-peer-count",
      "Notes": "Tally for peer count threshold",
      "TTL": "5s",
      "ServiceID": "bcl-commit-hub",
      "Status": "critical"
    }
  ]
}
`);
/* eslint-enable */
export default {
  svcDef,
};
