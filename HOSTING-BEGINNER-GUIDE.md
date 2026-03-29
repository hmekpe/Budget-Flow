# Budget Flow Beginner Hosting Guide

This guide is for the person who will host Budget Flow and may not know much about hosting yet.

The project includes:

- frontend
- auth backend
- feature backend
- PostgreSQL
- production Docker Compose setup

The recommended hosting pattern is:

- one Ubuntu server
- Docker + Docker Compose
- Caddy for HTTPS and reverse proxy
- optional Cloudflare for DNS

## 1. What You Need Before You Start

Ask the project owner to send you these privately, not in GitHub:

- real domain name
- `PUBLIC_WEB_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `GROQ_API_KEY`

Important production choices for this app:

- `GROQ_ENABLED=true`
- `FLOWISE_ENABLED=false`

That means the chatbot should use Groq for now and should not depend on Flowise.

## 2. What To Get From GitHub

Clone the project repository on the server:

```bash
git clone https://github.com/hmekpe/Budget-Flow.git
cd Budget-Flow
```

Do not expect real secrets in the repository. They are intentionally not committed.

## 3. Create The Server

Use an Ubuntu VPS. Ubuntu 24.04 LTS is a good choice.

Recommended minimum:

- 2 vCPU
- 4 GB RAM
- 40 GB SSD

Make sure the server has:

- ports `80` and `443` open to the internet
- SSH access on port `22`

## 4. Point The Domain To The Server

In your DNS provider:

1. create an `A` record
2. point the app hostname to the server public IPv4 address

Example:

- hostname: `app`
- value: `YOUR_SERVER_IP`

That would make the final app URL something like:

- `https://app.yourdomain.com`

## 5. SSH Into The Server

From your own terminal:

```bash
ssh root@YOUR_SERVER_IP
```

If the provider gave you a different user, use that instead of `root`.

## 6. Install Docker

Follow Docker's official Ubuntu install docs if needed:

- https://docs.docker.com/engine/install/ubuntu/

If Docker is not installed yet, a common production flow on Ubuntu is:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check that Docker works:

```bash
docker --version
docker compose version
```

## 7. Install Caddy For HTTPS

Caddy is recommended because it makes HTTPS simple.

Official install docs:

- https://caddyserver.com/docs/install

On Ubuntu, install Caddy using the official package instructions from the Caddy docs.

After installation, check:

```bash
sudo systemctl status caddy
```

## 8. Copy The Production Env File

Inside the project folder:

```bash
cp production.env.example .env.production
```

Now open the file:

```bash
nano .env.production
```

Fill these values with the real ones sent privately:

- `PUBLIC_WEB_URL=https://app.yourdomain.com`
- `POSTGRES_PASSWORD=...`
- `JWT_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `SMTP_HOST=...`
- `SMTP_PORT=...`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `MAIL_FROM=...`
- `GROQ_ENABLED=true`
- `GROQ_API_KEY=...`
- `FLOWISE_ENABLED=false`

Leave:

- `FLOWISE_API_KEY=` empty
- `FLOWISE_CHATFLOW_ID=` empty

## 9. Build The App Containers

Run:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
```

## 10. Initialize The Databases

Run these two commands:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml run --rm auth-backend bun run db:init
docker compose --env-file .env.production -f docker-compose.production.yml run --rm feature-backend bun run db:init
```

These commands prepare the auth and feature database tables.

## 11. Start The App Stack

Start the main production services:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres auth-backend feature-backend frontend
```

Check that the containers are up:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

## 12. Configure Caddy Reverse Proxy

This app's frontend container serves HTTP internally on port `8080` on the host.

Create or edit the Caddy config:

```bash
sudo nano /etc/caddy/Caddyfile
```

Use this shape:

```caddy
app.yourdomain.com {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
```

If you use a different hostname, replace `app.yourdomain.com`.

Save the file, then reload Caddy:

```bash
sudo systemctl reload caddy
```

Check Caddy:

```bash
sudo systemctl status caddy
```

## 13. Test The Website

Open:

- `https://app.yourdomain.com/pages/auth.html`

Then test:

1. sign up
2. login
3. Google sign-in
4. chatbot reply
5. password reset email
6. mobile view

## 14. Configure Google Sign-In For Production

In Google Cloud Console, the OAuth web client must allow the real frontend origin.

Add Authorized JavaScript origins like:

- `https://app.yourdomain.com`
- keep `http://localhost:5500` for local testing

Do not use the placeholder domain from the example env file.

## 15. If You Use Cloudflare

If DNS is managed in Cloudflare:

1. create the `A` record for the app hostname
2. point it to the server IP
3. if proxying through Cloudflare, use SSL mode `Full (strict)`

## 16. How To Update The App Later

When new code is pushed:

```bash
cd Budget-Flow
git pull origin main
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

If backend database changes were added, run the relevant init command again if the project owner says it is needed.

## 17. Useful Checks

See running containers:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

See logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f
```

See only feature backend logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f feature-backend
```

Restart the app stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml restart
```

## 18. Common Problems

### Site does not open

Check:

- DNS points to the correct server IP
- server firewall allows ports `80` and `443`
- Caddy is running
- Docker frontend container is running

### Google sign-in fails

Check:

- `GOOGLE_CLIENT_ID` is correct in `.env.production`
- the production domain is added to Authorized JavaScript origins in Google Cloud

### Chatbot does not answer with AI

Check:

- `GROQ_ENABLED=true`
- `GROQ_API_KEY` is filled correctly
- `FLOWISE_ENABLED=false`
- feature backend logs for API errors

### Password reset email does not arrive

Check:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

## 19. Files To Read In This Repo

- `HOSTING-HANDOVER.md`
- `PRODUCTION-DEPLOYMENT.md`
- `docker-compose.production.yml`
- `production.env.example`
- `deployment/frontend/default.conf`

