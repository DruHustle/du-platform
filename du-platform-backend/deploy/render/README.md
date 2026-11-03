# Render backend migration candidate

This is prepared source, not a deployment receipt. The current Oracle release
pipeline and Vercel frontend remain unchanged. `render.yaml` is deliberately
nested and auto-deploy is off. Creating its paid service requires an approved
resource selection and actual Render access. Reuse the correctly identified
existing service if appropriate instead of creating duplicates.

## Application contract

- Build context: `du-platform-backend`; Dockerfile: `deploy/oracle/Dockerfile`.
  It packages only the API, assets and runtime dependencies. Its name describes
  the original host; it supports Render's container runtime too.
- `/api/ping` exposes `APP_REVISION`, falling back to `RENDER_GIT_COMMIT`.
  `/api/health/db` is database readiness; `/api/ai/ready` verifies configured AI.
- Render supplies `PORT`. Preserve the existing JWT secret: it also encrypts
  saved order-access tokens and queued transactional payloads. Rotating it during
  relocation would make those records unreadable.
- Populate existing provider settings securely. The candidate starts with
  outbound delivery paused and prelaunch commercial policy; this is not a live
  production email configuration.
- Initial qualification uses an isolated MySQL copy. Startup performs existing
  additive schema/seed work, so a production connection is not a read-only test.

## MySQL persistence and independent backups

DU uses MySQL, not PostgreSQL. The production default remains Aiven. Opt into a
qualified self-hosted target using `DATABASE_PROVIDER=mysql`, `DATABASE_URL` (or
`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) and
`MYSQL_CA_CERT` or `MYSQL_CA_CERT_PATH`. Production requires verified TLS for both
providers; query parameters cannot disable it. The server certificate must cover
the actual private service hostname.

For a Render database container, use a separate **paid private service** in the
same region, pin a MySQL image compatible with the inspected source version,
mount its persistent disk at `/var/lib/mysql`, and enable server-side TLS with a
hostname-valid certificate and `require_secure_transport=ON`. Never put MySQL in
the API's ephemeral filesystem or add a public database HTTP proxy. Database
credentials must be unique to DU. This change does not create or switch that DB.

Before copying production, create and restore a consistent MySQL backup into a
disposable database. `mysqldump --single-transaction` requires transactional tables
and no concurrent DDL; inventory table engines, routines, triggers, events,
collations and source/target compatibility first. Store encrypted backups outside
Render and Oracle, with a tested restore and separate retained encryption key.
Backblaze B2, if selected, is backup object storage, not a live database. Select a
binlog/PITR scheme if the required recovery point is tighter than dump cadence.
Render disk snapshots are not a substitute for database-consistent backups.

## Qualification and cutover

1. Run backend checks/tests/build and restore rehearsal. Inspect the candidate's
   exact revision and real DB/AI readiness, with outbound mail paused.
2. Run account, reset, admin, shop, newsletter and mobile API contract checks with
   isolated approved test data. Verify candidate restart persistence.
3. Prepare a separate release-path change: current CI intentionally requires the
   Oracle release before Vercel and its deployment guardrails enforce that path.
   Do not bypass those gates or point Vercel at an unqualified candidate.
4. At the coordinated cutover, pause old workers and writes, take the final copy,
   verify it, then switch the Vercel same-origin `/api` proxy and mobile API URL.
   Preserve the frontend domain and its browser API URL `/api`.
5. Enable delivery only on the selected active backend, then verify revision,
   private data access, queue processing, mail links and rollback compatibility.
6. Disable the old Oracle release timer before retiring its DU container. Keep
   the rollback image and data; never remove other applications or shared ingress.

Once new production writes exist, rollback must reconcile those writes. DNS or
proxy rollback alone cannot safely restore an outdated database.

Official references: [Render Docker](https://render.com/docs/docker),
[private networking](https://render.com/docs/private-network),
[MySQL](https://render.com/docs/deploy-mysql),
[persistent disks](https://render.com/docs/disks), and
[Blueprint fields](https://render.com/docs/blueprint-spec).
