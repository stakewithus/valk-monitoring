# valk-server

## Setup
`docker-compose up -d`
### Init vault with admin user
docker-compose up -d, make sure both valk-server, vault is running:
- `docker-compose exec vault /bin/sh`
- `export VAULT_ADDR='http://0.0.0.0:8200'`
- `vault login (use root token provided when init of vault)` and ensure its unsealed 
- `vault auth enable userpass`
- Encode username from string to hex: `echo -n "admin@test.com" | od -A n -t x1 | sed 's/ *//g'`
- "user" as encoded username,"pw" as plaintext password `vault write auth/userpass/users/[user] password=[pw]`

Add .env file with: 
- SERVER_PORT=3001
- VAULT_ADDRRESS=120.0.0.1:8200 (without http://)
- VAULT_TOKEN=
- JWT_SECRET=secret1
- JWT_REFRESH_SECRET=secret2
- JWT_VERIFICATION_SECRET=secret3
- JWT_FORGOT_PASSWORD_SECRET=secret4
- JWT_TOKEN_EXPIRES_IN=3600
- ADMIN_USERNAME=admin@test.com
- ADMIN_PASSWORD=123456
- CLIENT_BASE_URL=http://localhost:8080
- SENDGRID_API_KEY=
- SENDGRID_EMAIL_FROM=Valk Supports <supports@valk.io>