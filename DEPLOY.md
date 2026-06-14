# Deployment

TimetableX ships as a Docker image built by CI and deployed via Watchtower (pull-based — no
inbound SSH from GitHub required).

## One-time VPS setup

These steps only need to be done once on the VPS (`/opt/timetablex`).

> **Note:** Docker on this VPS runs **rootless** under the `me` user. The Docker socket lives at
> `/run/user/1000/docker.sock` and the Docker config at `/home/me/.docker/config.json` — both are
> already referenced correctly in `docker-compose.yml`.

### 1. Copy files to the VPS

```bash
scp docker-compose.yml me@185.207.105.133:/opt/timetablex/
```

### 2. Create `.env` on the VPS

```bash
mkdir -p /opt/timetablex
nano /opt/timetablex/.env
# Add all production environment variables here (NEXT_PUBLIC_* etc.)
```

### 3. Authenticate Docker with GHCR

Generate a GitHub Personal Access Token with **`read:packages`** scope only, then on the VPS:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

This writes credentials to `/home/me/.docker/config.json`, which Watchtower mounts read-only to
pull new images.

### 4. Set package visibility (if the repo is private)

Go to GitHub → the `timetablex` package → Package settings → make it public, or ensure the PAT
above has access to the package.

### 5. Set up Caddy and the `caddy-public` network

This VPS does not yet have a reverse proxy running. Create the shared network and a Caddy
container that `web` will join:

```bash
docker network create caddy-public
```

Add a `Caddyfile` (e.g. `/opt/caddy/Caddyfile`) containing:

```caddy
timetablex.space {
  reverse_proxy web:3000
}
```

Run Caddy on the `caddy-public` network with ports 80/443 published and the `Caddyfile` mounted,
e.g.:

```bash
docker run -d --name caddy --restart unless-stopped \
  --network caddy-public \
  -p 80:80 -p 443:443 \
  -v /opt/caddy/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:2-alpine
```

Caddy handles HTTPS/TLS automatically via Let's Encrypt as long as `timetablex.space` resolves
(via Cloudflare DNS) to this VPS and ports 80/443 are reachable.

To reload Caddy after editing the `Caddyfile`:

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 6. Start the stack

```bash
cd /opt/timetablex
docker compose up -d
```

## Future deploys

Publish a new GitHub Release → Actions runs tests → builds the image → pushes to GHCR →
Watchtower picks it up within 60 seconds and redeploys `web` automatically.
