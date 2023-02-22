# valk-monitoring

## Start backend interface
- `cd backend`
- Duplicate app.env.example into app.env and add in SENDGRID API details if needed
`docker-compose up -d`
### Init vault with admin user
docker-compose up -d, make sure both valk-server, vault is running:
- `docker-compose exec vault /bin/sh`
- `export VAULT_ADDR='http://0.0.0.0:8200'`
- `export VAULT_TOKEN='ROOT_TOKEN'`
- `vault login (use root token provided when init of vault)` and ensure its unsealed 
- `vault auth enable userpass`
- `(
cat <<-EOF
path "auth/userpass/users/*" {
  capabilities = ["create", "update", "read", "delete"]
}
EOF
) | sudo tee app-policy`
- `vault policy write app-policy app-policy.hcl`
- Encode username from string to hex: `echo -n "admin@test.com" | od -A n -t x1 | sed 's/ *//g'` Remember the encoded username
- "user" as encoded username,"pw" as plaintext password `vault write auth/userpass/users/[user] password=[pw] policies=app-policy`

## Start frontend interface
### Configuration to connect to backend api and apm api
- Located in frontend/src/config
- `cd frontend && docker-compose up -d`

## Start APM API (tendermint monitoring)

### Configuration
- Duplicate app.env.example to app.env
- Add in twillo, slack, phone numebers to call in app.env for monitoring and calls
- Rename example.env to .env
- Add in the projects that you would want to monitor under, include in project name and validator address: `apm/build/config/prod.js`
- Add in nodes(sentries) to be monitored under: `apm/config.json`

### Prebuild the apm docker image
- Ensure node is install
- `npm install &*& npm run build`
- `docker-compose up -d --build`


## Login in
- Navigate to `<ip address>:8080`and login using the details created in the backend