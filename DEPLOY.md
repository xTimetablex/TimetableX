# Deployment

Production (`timetablex.space`) runs on the VPS `185.207.105.133` under **Openship**, a self-hosted
deployment platform. Its dashboard is at https://dash.timetablex.space. The Openship project
**TimetableX** (`proj_yHp96pH-btfnueGl`) doesn't build anything itself. It deploys the prebuilt
image that GitHub Actions publishes for each GitHub Release.

## How a release goes live

1. Publish a GitHub Release (tags look like `1.2.3`, without a `v`).
2. `.github/workflows/deploy.yml` runs the tests, then React Doctor (advisory), then builds the
   Docker image and pushes `ghcr.io/xtimetablex/timetablex:<tag>` and `:latest`.
3. The last step POSTs to the Openship project's incoming **deploy webhook**.
4. Openship resolves the latest GitHub Release of `xTimetablex/TimetableX`, pulls
   `ghcr.io/xtimetablex/timetablex:{tag}`, and swaps the container. The old container keeps
   serving until the new image has been pulled.

Openship v0.9.3 notices new releases ("update available") but doesn't deploy them on its own
(`trackReleases` is reserved and unused). The webhook in step 3 is what makes deploys automatic.

## Configuration

**GitHub repository secrets:**

| Secret | Purpose |
|---|---|
| `OPENSHIP_DEPLOY_HOOK_URL` | Incoming webhook URL (via the dashboard proxy, `…/api/webhooks/incoming/iwh_…`) |
| `OPENSHIP_DEPLOY_HOOK_TOKEN` | Bearer token for that webhook. Rotate it in Openship under the project's incoming webhooks |
| `SENTRY_AUTH_TOKEN` | Optional. Sentry organization token for source map upload, passed into the Docker build as a BuildKit secret |

**Build-time values** (`NEXT_PUBLIC_*`, `SENTRY_RELEASE`) are Docker build args in `deploy.yml`.
They're inlined into the bundle, so changing them needs a new release.

**Runtime env, set in Openship** (project → Environment → production):

| Variable | Purpose |
|---|---|
| `TIMETABLEX_AUTH_SECRET` (secret) | Key for the encrypted session cookie. Without it the app falls back to a public dev key. Changing it logs every user out once |

**Image pull access:** the GHCR package is private, so Openship needs a **Container registry**
credential for `ghcr.io` (Settings → Credentials), using a GitHub token with `read:packages`.
The alternative is making the package public.

## Manual operations

- **Redeploy or update now:** in the Openship dashboard, open the project → Deploy / Update. Or
  fire the webhook yourself:
  `curl -X POST -H "Authorization: Bearer $TOKEN" "$OPENSHIP_DEPLOY_HOOK_URL"`.
- **Roll back:** in the Openship dashboard, open the project → Deployments → pick an earlier
  deployment → Rollback.
- **Pin a version:** set a pinned version on the project's release image source. Remove the pin to
  go back to tracking the latest release.

## Local Docker build

```bash
docker build -t timetablex --build-arg NEXT_PUBLIC_SENTRY_DSN=... .
docker run -p 3000:3000 -e TIMETABLEX_AUTH_SECRET=$(openssl rand -hex 32) timetablex
```

The Dockerfile uses `RUN --mount=type=secret`, which needs BuildKit, the default for `docker
build` in current Docker. Openship's own git builds use the legacy builder and can't build this
Dockerfile. That's one more reason production deploys the prebuilt image.
