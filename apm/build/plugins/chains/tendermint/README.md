# Objectives
Crawl the tendermint RPC endpoints to produce a snapshot of the node state
- Use an async function to call the 4 RPC endpoints and produce the below expected return data

## Mapping
- http://NODE_HOST:NODE_IP/status -> apm_status.json
- http://NODE_HOST:NODE_IP/net_info -> apm_net_info.json
- http://NODE_HOST:NODE_IP/block?height=QUERY_HEIGHT -> apm_block.json
- http://NODE_HOST:NODE_IP/validators?height=QUERY_HEIGHT -> apm_validators.json

## Expected Return Data
```json
{
  "meta": {
    "id": "",
    "": "",
  },
  "block_height": "500,000",
  "validator_commits": [{
    "name": "StakeWith.Us",
    "commit": true | false,
  }],
  "block_time": "unixtimestamp",
  "total_peers": 3,
  "inbound_peers": 1,
  "outbound_peers": 2,
  "query_response_time_ms": 100,

}
```
