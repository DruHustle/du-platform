# Oracle backend

Production runs on the shared **Software Engineering Backend** VM, hostname
`software-engineering-backend`, ARM64, at `152.70.22.84`. The Onesa VM is separate.

- HTTPS API: `https://du-api.152-70-22-84.sslip.io`
- Frontend: `https://www.diasporaunlocked.com` (Vercel `/api/*` proxy)
- Runtime directory: `/opt/du-platform`
- Loopback-only diagnostic port: `127.0.0.1:11000`
- External ingress network: `du-platform-ingress`; Caddy alias: `du-platform-api`
- Initial runtime source: `5e0a5fb73b7d8149de4165ac8ec1cb11e2281db5`

Vercel builds explicitly use `VITE_API_URL=/api` so browser requests go through
the configured same-origin proxy. A stale dashboard environment override must
not send visitors to the retained, suspended Render service. Build and live SEO
checks also inspect the actual browser entry bundle for that retired origin;
checking the proxy's health endpoint alone does not verify client routing.

## Automatic releases from main

A push to `main` runs `.github/workflows/ci-cd.yml`:

1. Build and Test validates types, dependencies, unit/database tests, the build
   and browser journeys. Failed checks prevent both production deployments.
2. Deploy to Oracle sends `git archive` of the tested commit over pinned SSH.
   The VM builds the image natively for ARM64 and releases only DU's `app`
   service. Runtime secrets remain in `/opt/du-platform/compose.runtime.json`.
3. Deploy to Vercel publishes the frontend only after Oracle succeeds. Both jobs
   check the expected backend commit through Oracle and the frontend API proxy;
   the frontend job also verifies live canonical pages and browser API routing.

GitHub Pages is not used. Vercel's independent Git deploys are disabled so that
CI remains the deployment gate. Main releases are serialized, not cancelled
halfway through a deployment. Preview deployments remain frontend-only.

The dedicated key is stored in `ORACLE_SSH_PRIVATE_KEY`; `ORACLE_KNOWN_HOSTS`
pins the VM's public host key. The VM's `authorized_keys` entry uses `restrict`
and a forced `/usr/local/bin/du-platform-ci-entry` command. It accepts only
`du-deploy <40-character SHA>` and cannot provide a shell, PTY or forwarding.
The root-owned `/usr/local/sbin/du-platform-deploy` corresponds to
`deploy/oracle/deploy.sh`. Changes to these privileged entrypoints require a
separate reviewed installation; ordinary application releases cannot replace
these host scripts.

The release script locks deployment, builds without extracting source on the
host, checks the image revision, privately backs up both manifests, updates only
DU's image and `APP_REVISION`, then waits for container health. It checks database
readiness, the published commit and Onesa readiness. Failure after switching
manifests restores the previous DU manifests and image. Sibling stacks are not
restarted. Backups contain runtime configuration and remain root-readable only.

## Manual recovery

Run repository checks before any manual release. Build a `linux/arm64` image
using `deploy/oracle/Dockerfile` with `APP_REVISION` set to the tested SHA. Never
include private configuration in a build context. Preserve the previous image
and both Compose manifests before an update. Validate Compose with
`config --quiet`, then use `up -d --no-deps --wait app` with both files.

The installed manifests are JSON despite the `compose.yaml` extension. Keep
multiline CA/signing keys and literal `$$` Compose escaping intact; never print
`docker compose config` or commit the runtime override. Production uses
`NODE_ENV=production`, `PORT=10000`, `TRUST_PROXY=1`. Verify `/api/ping`,
`/api/health/db` and `/api/ai/ready` directly and through the frontend after release.

## Ingress and monitoring

Caddy configuration remains in `/opt/smart-factory-basyx/Caddyfile` for continuity;
the directory name describes the original workload, not this shared VM. Caddy
joins each application's private ingress network. Network declarations are
persisted in its Compose file; validate before a graceful Caddy reload.
No new public application ports or firewall rules are required.

Docker retains its container health check. Use the readiness endpoints above
for manual release verification; scheduled GitHub probes and health alert emails
have been removed.
Oracle container releases run through CI before Vercel production releases. Keep the
former Render service suspended with automatic deployments disabled.

Onesa's secondary cloud provider uses `ONESA_GROQ_AI_BASE_URL`,
`ONESA_GROQ_AI_API_KEY`, `ONESA_GROQ_MODEL`, `ONESA_GROQ_FALLBACK_MODEL` and
`ONESA_GROQ_MODEL_CANDIDATES`. Legacy `ONESA_GROK_*` aliases remain supported;
nonempty `ONESA_GROQ_*` values take precedence. Verify model IDs against the
provider's authenticated `/models` endpoint and run a real completion before
changing production models. Listing models alone does not prove completion
quota is available. Verify a normal conversation through the public chat route
after a release, including fallback when the primary provider is rate limited.

## Rollback

Retain the previous local image and Compose manifest. Restore its image tag and
run the same Compose update command, then repeat readiness/auth checks. This
migration reused existing managed databases; no data was copied or deleted.
The retired Render manifest and deployment workflow have been removed. Historical
configuration remains available in Git history and the private migration backup;
it is not an active deployment target.
Never remove or duplicate the shared VM's existing singleton IoT worker.
