# Free Render web service

This directory prepares the independent DU backend as a normal Render web
service on the `free` compute plan. The Blueprint defines one service in
Frankfurt, with automatic deployment off. It does not create a cron job,
database, disk, or worker.

A checked-in Blueprint does not create a resource or move public traffic.
Verify the actual service configuration and application readiness before
selecting it as the active backend.

## Build and runtime

Use the repository root with these explicit paths:

- Docker context: `du-platform-backend`
- Dockerfile: `du-platform-backend/deploy/render/Dockerfile`
- Start command: the Docker image's `node dist/server.js`
- HTTP readiness path: `/api/health/db`
- Liveness path: `/api/ping`

The image contains only backend runtime files and runs as the `node` user.
Render supplies `PORT` and `RENDER_GIT_COMMIT`. Do not set a stale
`APP_REVISION`, because it takes precedence in the version response.

Keep runtime configuration in the hosting provider's secure environment
settings. Never commit secret values. The Blueprint's `sync: false` fields
must be supplied before the application can be qualified.

DU requires an external durable MySQL database with verified TLS. Free web
service storage is ephemeral. The optional self-hosted database examples in
`../database` are outside this free-service configuration. Render uses `DATABASE_STARTUP_MODE=verify`: startup checks every required runtime
column in a MySQL read-only transaction. It does not run DDL, seed data, rewrite
credentials or create admin accounts. A missing schema/column or unavailable
database stops startup even when memory fallback was requested. The default
`initialize` mode preserves existing local/Oracle behavior; it must not be used
for production-database candidate qualification. Keep outbound messages paused
and commercial operations in prelaunch mode during qualification.

## Release behavior

Render is the only production backend. `DU_BACKEND_HOST` may be unset or
`render`; every other value is refused. The service, workspace and origin still
come from the corresponding repository deployment variables. Read the release
script for the complete configuration contract. Automatic service deployment
must remain disabled. No production workflow can request an Oracle release.

The release job verifies the selected service, the free plan, and the exact
tested revision. Database and AI readiness must pass before the staged frontend
API proxy can change. The tracked frontend proxy now records the verified
production origin, `https://du-platform-api.onrender.com`. Production staging
still verifies the Render backend before preparing its proxy. Historical VM
backends cannot be selected for a production rollout or proxy rollback. Changing
the tracked origin does not bypass release evidence. Production
configuration and live acceptance are separate from source-level tests.

Check the applied HTTP health-check setting in the Render Dashboard: some
creation tools expose only the platform's default TCP check.

## Outbox workers and free-service limits

The web process already starts the newsletter, order-notification and
transactional-message workers. They use the existing durable MySQL queues,
advisory locks and stable Resend idempotency keys, and send over HTTPS. A
separate worker service is not required. During qualification,
`OUTBOUND_MESSAGES_PAUSED=true` suppresses provider calls. Clear it only after
the old consumer is stopped and the existing JWT/payload encryption key,
database and sender configuration are confirmed unchanged. Do not create a new
job or send a test message to qualify this hosting change.

A GET to `/api/ping` checks liveness without a database or AI-provider request.
No keepalive schedule is created or required by these deployment files.

Free web services sleep after 15 minutes without inbound traffic and can
restart at any time. A keepalive does not guarantee availability. The workspace
shares 750 free instance-hours per calendar month across all free web services;
continuous operation in a 30-day month uses about 720 hours for one service.
Queued work remains durable while the free process is asleep, but delivery is
delayed until it wakes. This configuration does not promise an always-on sender.

## Recovery and retirement

The old Oracle scripts are retained as historical recovery material. Their
container/SSH adapter cannot run inside a free Render web service. Keep the
encrypted archives and the separate existing passphrase/JWT custody until an
independent owner-device or managed-database recovery path is verified. Never
place backup keys in the frontend or an archive download. See
[the Render-only handoff](retirement.md) for sequencing and remaining custody.

Validate the Blueprint against the current
[Render JSON Schema](https://render.com/schema/render.yaml.json). See the
official [free-service limits](https://render.com/docs/free),
[Docker guide](https://render.com/docs/docker),
[health checks](https://render.com/docs/health-checks), and
[Blueprint reference](https://render.com/docs/blueprint-spec).

### Cold AI qualification

A newly started cloud-backed API intentionally reports `/api/ai/ready` as 503
until an actual authorized generation succeeds for its current provider, model
and credential configuration. The model catalogue alone is insufficient. The
proof expires after two minutes without another generation, and health checks
do not issue cloud inference. The service's Render health path remains the
independent database readiness path, avoiding AI warm-up/restart loops.

The production publication gate still requires AI readiness. Stage the backend,
perform a bounded owner-controlled inference using an already approved provider
and verified free allowance, then run the exact-revision backend and frontend
publication checks within the proof window. This needs an explicit qualification
step before automatic frontend promotion; a deploy-only pipeline that skips it
must stop. Do not change readiness to success, enable mock mode, generate paid
warm-ups or remove the gate to release an unqualified candidate.
