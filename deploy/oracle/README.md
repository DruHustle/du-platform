# Oracle backend

Production runs on the shared **Software Engineering Backend** VM, hostname
`software-engineering-backend`, ARM64, at `152.70.22.84`. The Onesa VM is separate.

- HTTPS API: `https://du-api.152-70-22-84.sslip.io`
- Frontend: `https://www.diasporaunlocked.com` (Vercel `/api/*` proxy)
- Runtime directory: `/opt/du-platform`
- Loopback-only diagnostic port: `127.0.0.1:11000`
- External ingress network: `du-platform-ingress`; Caddy alias: `du-platform-api`
- Initial runtime source: `5e0a5fb73b7d8149de4165ac8ec1cb11e2281db5`

## Build and update

Run the repository's tests, typecheck, build and SEO checks first. Build a
`linux/arm64` image from a clean checkout of the tested commit using
`docker build --platform linux/arm64 --build-arg APP_REVISION=<sha> -f deploy/oracle/Dockerfile -t du-platform:oracle-<sha> .`.
Exclude `.env*`, `.git`, `node_modules`, build output and private files from the
build context. Never build secrets into an image. Transfer with `docker save`
and load with `sudo docker load` on the VM; verify the archive checksum.

The installed `compose.yaml` pins the tested image. Back it up before changing
that image to the new tag. `compose.runtime.json` is a private mode-600 override
containing the production environment copied from the former Render service,
including the unchanged managed MySQL connection, multiline CA and signing keys.
Use literal JSON strings and escape every `$` as `$$` for Compose interpolation.
Do not commit the override or print `docker compose config` output.
Set `NODE_ENV=production`, `PORT=10000`, `TRUST_PROXY=1`, and
`RENDER_GIT_COMMIT=<source-sha>` (the existing ping response contract).

From `/opt/du-platform`, validate with
`sudo docker compose -f compose.yaml -f compose.runtime.json config --quiet`,
then run `sudo docker compose -f compose.yaml -f compose.runtime.json up -d --wait`.
If using the repository template directly, set `APP_IMAGE` to the tested tag.
Check `/api/ping` for the expected commit and `/api/health/db` for database
readiness, then verify the same endpoints through the frontend `/api` proxy.
Run `pnpm test:seo:live` after a frontend release. Do not restart sibling stacks.

## Ingress and monitoring

Caddy configuration remains in `/opt/smart-factory-basyx/Caddyfile` for continuity;
the directory name describes the original workload, not this shared VM. Caddy
joins each application's private ingress network. Network declarations are
persisted in its Compose file; validate before a graceful Caddy reload.
No new public application ports or firewall rules are required.

GitHub health checks use `BACKEND_HEALTH_URL`, `BACKEND_DATABASE_HEALTH_URL` and
`BACKEND_ONESA_HEALTH_URL`; legacy Render variable names remain fallback-compatible.
Oracle container releases are manual, independent from Vercel releases. Keep the
former Render service suspended with automatic deployments disabled.

## Rollback

Retain the previous local image and Compose manifest. Restore its image tag and
run the same Compose update command, then repeat readiness/auth checks. This
migration reused existing managed databases; no data was copied or deleted.
For an emergency Render rollback, explicitly resume the retained service and
verify health before restoring the Vercel API proxy. Leave
`RENDER_ROLLBACK_ENABLED` false unless intentionally testing that path.
Never remove or duplicate the shared VM's existing singleton IoT worker.
