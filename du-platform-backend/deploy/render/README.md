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

The GitHub release workflow keeps Oracle as its default. Render is an explicit
opt-in through `DU_BACKEND_HOST=render` and the corresponding repository
deployment variables. Read the release script for the complete configuration
contract. Automatic service deployment must remain disabled.

The release job verifies the selected service, the free plan, and the exact
tested revision. Database and AI readiness must pass before the staged frontend
API proxy can change. The tracked frontend proxy now records the verified
production origin, `https://du-platform-api.onrender.com`. Production staging
still verifies the selected backend before preparing its proxy, including an
explicit Oracle rollback. Changing the tracked origin does not change the
workflow's backend selection or bypass release evidence. Production
configuration and live acceptance are separate from source-level tests.

Check the applied HTTP health-check setting in the Render Dashboard: some
creation tools expose only the platform's default TCP check.

## External keepalive

The user manages their own cron. Once the service is live, a GET to its
`/api/ping` endpoint checks liveness without a database or AI-provider request.
No keepalive schedule is created here.

Free web services sleep after 15 minutes without inbound traffic and can
restart at any time. A keepalive does not guarantee availability. The workspace
shares 750 free instance-hours per calendar month across all free web services;
continuous operation in a 30-day month uses about 720 hours for one service.

Validate the Blueprint against the current
[Render JSON Schema](https://render.com/schema/render.yaml.json). See the
official [free-service limits](https://render.com/docs/free),
[Docker guide](https://render.com/docs/docker),
[health checks](https://render.com/docs/health-checks), and
[Blueprint reference](https://render.com/docs/blueprint-spec).
