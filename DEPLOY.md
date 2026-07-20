# Deployment

TimetableX ships as a Docker image built by CI and deployed via Watchtower (pull-based — no
inbound SSH from GitHub required).

## One-time VPS setup

These steps only need to be done once on the VPS (`/opt/timetablex`).

> **Note:** The Docker daemon on this VPS is rootful, listening on `/var/run/docker.sock`
> (owned by `root:docker`). The deploy user is not in the `docker` group, so run `docker` /
> `docker compose` commands with `sudo` — this matches the `/var/run/docker.sock` and
> `/root/.docker/config.json` paths already referenced in `docker-compose.yml`.

### 1. Copy files to the VPS

```bash
scp docker-compose.yml <user>@185.207.105.133:/opt/timetablex/
```

### 2. Create `.env` on the VPS

```bash
sudo mkdir -p /opt/timetablex
sudo nano /opt/timetablex/.env
```

Required variable:

- `TIMETABLEX_AUTH_SECRET` — random secret used to encrypt the session cookie that stores school
  login credentials. Generate with `openssl rand -hex 32`. Without it the app falls back to an
  insecure built-in development secret.

`NEXT_PUBLIC_*` variables (e.g. `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_UMAMI_*`) are inlined at
**build time** by the `deploy` workflow, not read from this `.env`.

### 3. Authenticate Docker with GHCR

Generate a GitHub Personal Access Token with **`read:packages`** scope only, then on the VPS:

```bash
echo YOUR_GITHUB_PAT | sudo docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

This writes credentials to `/root/.docker/config.json`, which Watchtower mounts read-only to
pull new images.

### 4. Set package visibility (if the repo is private)

Go to GitHub → the `timetablex` package → Package settings → make it public, or ensure the PAT
above has access to the package.

### 5. Set up Caddy and the `caddy-public` network

This VPS does not yet have a reverse proxy running. Create the shared network and a Caddy
container that `web` will join:

```bash
sudo docker network create caddy-public
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
sudo docker run -d --name caddy --restart unless-stopped \
  --network caddy-public \
  -p 80:80 -p 443:443 \
  -v /opt/caddy/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:2-alpine
```

Caddy handles HTTPS/TLS automatically via Let's Encrypt, **but only once `timetablex.space`
resolves to this VPS's IP** via Cloudflare DNS. Until the DNS record is updated, Caddy will keep
retrying the ACME challenge in the background — update the `A`/`AAAA` record and it will pick up
a certificate automatically.

To reload Caddy after editing the `Caddyfile`:

```bash
sudo docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 6. Start the stack

```bash
cd /opt/timetablex
sudo docker compose up -d
```

This requires the `ghcr.io/xtimetablex/timetablex` image to exist (i.e. a release has been
published at least once) and step 3's `docker login` to have succeeded if the package is
private.

## Future deploys

Publish a new GitHub Release → Actions runs tests → builds the image → pushes to GHCR →
Watchtower picks it up within 60 seconds and redeploys `web` automatically.
