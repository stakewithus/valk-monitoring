# apm-agent

## Pre-Requisites

1. Kava Application Images
   ```bash
   $(aws ecr get-login --profile stakewithus --no-include-email)
   docker pull 218989195752.dkr.ecr.ap-southeast-1.amazonaws.com/kava:v0.2.0
   docker tag 218989195752.dkr.ecr.ap-southeast-1.amazonaws.com/kava:v0.2.0 kava:v0.2.0
   ```

2. Copy over kvd-blank to kvd
   ```bash
   cp kvd-blank/ kvd -R
   ```

3. Install Nomad and Consul

4. Run Consul
   ```bash
   consul agent -dev
   ```

5. Run Nomad in Dev
   ```bash
   npm run nomad-dev
   ```

## Testing

1. Build the docker image
   npm run build
2. Run the docker image
   ```bash
   # Replace /home/saber/Development/MWP/apm-agent with your own folder
   docker run --mount type=bind,src=/home/saber/Development/MWP/apm-agent/config,dst=/app \
     --network host \
     --rm \
     -it \
     app-apm-agent:0.0.4 \
     sync --node 127.0.0.1 --config /app
   ```
3. Check that the nomad jobs are running
   ```bash
   nomad job status

   nomad job status blockchain-client
   ```

## Test Monit

1. Run the monit command
   ```bash
   docker run --mount type=bind,src=/home/saber/Development/MWP/apm-agent/config,dst=/app \
     --network host \
     --rm \
     -it \
     app-apm-agent:0.0.4 \
     monit --node 127.0.0.1

   ```
## Stop Client and Reset the Folder

So that the download size does not bloat up.
```bash
nomad job stop blockchain-client
rm -rf kvd/
cp kvd-blank/ kvd -R
```

# Web Server
- GET All servers status
```
[GET]: /api/v1/status
Sample Response:
[{"blockHeight":"245587","blockTime":"1566090589","catchingUp":"1","peersInbound":"0","peersOutbound":"48","peersTotal":"48","projectName":"bcl-kava","networkName":"kava-testnet-2000","commits": [true, false ...]}]
```

- Get Specifig node status
[GET]: /api/v1/node-status/[projectName]/[networkName]/[region]
fx [GET] /api/v1/node-status/kava/kava-testnet-2000/ap-southeast-1a
```
Sample Response:
{"blockHeight":"245587","blockTime":"1566090589","catchingUp":"1","peersInbound":"0","peersOutbound":"48","peersTotal":"48","projectName":"bcl-kava","networkName":"kava-testnet-2000","commits": [true, false ...]}
```

# Github Integration
## Flow
- Create new folder called source-code-tmp
- Clone the branch into source-code-tmp folder
- Run sync command with node same as server command, configDir is source-code-tmp/config
- Remove source-code-tmp folder

## Setup
- Setup github webhook with endpoint: http://[api-url]/github/webhook and a secret
- Add new environment variable to .env file
GITHUB_SECRET_TOKEN       // github secret to validate the request
GITHUB_BRANCH           // branch which is used to trigger update
GITHUB_TOKEN
GITHUB_REPO  // for monit to get the config
- The config folder in the source code: ./config
- Then push a commit to the above branch to trigger sync function.

# Notification
## Slack
- Manage slack app: https://api.slack.com/apps
- Install the app
- Add new environment variable to .env file
SLACK_SECRET_TOKEN   // slack secret of the app
SLACK_INCOMING_WEBHOOK
- Slash command: health [node] [health-check]
  fx: health kava tm-missed-blocks
- Incomming webhook: config at https://api.slack.com/apps/ANASVKB9T/incoming-webhooks

## Twilio
- Add new environment variable to .env file
TWILIO_ACCOUNT_ID
TWILIO_SECRET_TOKEN
TWILIO_FROM_PHONE
TWILIO_TO_PHONE
API_DOMAIN=http://localhost:3000

## InfluxDb
INFLUXDB_HOST=http://127.0.0.1
INFLUXDB_PORT=8086

## Prometheus
PROMETHEUS_API_URL=http://127.0.0.1:9090/api/v1

# Production monitoring
- New config file in prod-config folder config.json
- app.env : app config env
- env: docker compose config file
- Command option is in docker compose file
- To list muting nodes:
  - {{server}}/api/v1/apm-muted-nodes/list
- To mute a node:
  - {{server}}/api/v1/apm-muted-nodes/update?nodes=[region:projectName]
  - fx: {{server}}/api/v1/apm-muted-nodes/update?nodes=ap-southest-1a:loom
