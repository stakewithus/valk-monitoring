# Valk-Monitoring

## Requirements
- Node v18.4, docker installed

## Summary 
- Frontend -> frontend interface of valk
- Backend -> backend interface of valk
- apm -> backend api tendermint projects and alerts
- Hashicorp Vault -> login details, secrets
- Hashicorp Consul -> Service discovery for nodes

## Usage

### APM monitoring
- Head into apm folder
- Duplicate app.env.example to app.env
- Add in twillo, slack, phone numebers to call in app.env for monitoring and calls
- Add in the projects that you would want to monitor under, include in project name and validator address: `apm/build/config/prod.js`
- Add in nodes(sentries) to be monitored under: `apm/config.json`
- Run build.sh to prebuild image for apm: `./valk-monitoring/build.sh`

### Start frontend, backend + other services
- Duplicate app.env.example in the backend folder into app.env and add in SENDGRID API details if needed. Take note of the vault token as this will need to be replaced once the vault service is up
- `docker-compose up -d --build`
- Create db in influx db: `curl -XPOST 'http://localhost:8086/query' --data-urlencode 'q=CREATE DATABASE "apm"'`

### Initialise admin account in vault service 
- `docker-compose exec vault /bin/sh`
- `vault operator init`
- Take note of the root token and all the unseal tokens
- `vault operator unseal UNSEAL_TOKENS` x3
- Ensure vault is unseal by checking `vault status`
- `vault login (use root token provided when init of vault)` and ensure its unsealed 
- `vault auth enable userpass`
- `(
cat <<-EOF
path "auth/userpass/users/*" {
  capabilities = ["create", "update", "read", "delete"]
}
EOF
) | tee app-policy.hcl`
- `vault policy write app-policy app-policy.hcl`
- Encode username from string to hex: `echo -n "admin@test.com" | od -A n -t x1 | sed 's/ *//g'` Remember the encoded username
- "user" as encoded username,"pw" as plaintext password `vault write auth/userpass/users/[user] password=[pw] policies=app-policy`
- exit the docker container command line
- Replace VAULT_TOKEN in app.env with the root token
- `docker-compose up -d --build`

### Configuration
- Replace frontend/src/config/dev.js with the correct ip address
- Ensure vault is unsealed. If its sealed, unseal it


## Login in
- Navigate to `<ip address>:8080`and login using the details created in the backend


