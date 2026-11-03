# Optional persistent MySQL candidate

DU's current production primary remains Aiven. These files add a separate,
opt-in database container for an isolated restore rehearsal and a possible later,
reviewed primary change. They create no resources when committed and configure
no replication, failover or double-write. The application image still connects
to a separate database. DU uses MySQL; PostgreSQL is not a compatible replacement
for its existing schema and client.

## Integrate with the existing Docker application

`compose.database.yaml` is a separate Compose project with the
`candidate-database` profile. MySQL joins only an internal network and publishes
no host ports. Its external named data volume must already exist on reviewed
durable storage; Compose does not create an unnoticed replacement after a project
rename or manage its deletion. Never prune database volumes. A volume on the
same host is not an independent backup.

`compose.application-database.yaml` adds only that network and a read-only CA
mount to the `app` in `../oracle/compose.yaml`. Existing ingress, ports, image
and runtime configuration remain through Compose merging. Use this with an
isolated app project and retained private runtime configuration when qualifying
the candidate. It does not connect or restart the serving app. The production
Oracle release worker and Vercel deployment gates are unchanged.

The application already supports an explicit `DATABASE_PROVIDER=mysql` with
`DATABASE_URL` or the individual `MYSQL_*` connection fields. Production
requires `MYSQL_CA_CERT` or `MYSQL_CA_CERT_PATH` and verifies both the
certificate and hostname. The default `DATABASE_PROVIDER=aiven` retains the
existing `AIVEN_*` primary. The API has one selected primary; these files do not
write to two databases.

Keep real runtime files, credentials, certificate keys and dumps outside the
checkout and build context. Compose `--env-file` supplies interpolation values;
it does not inject `application.env.example` into an app. Merge the example's
DB fields only into the isolated instance or approved cutover configuration,
preserving `JWT_SECRET` (also used to encrypt stored application material),
frontend origins, provider settings and outbound-message policy. URL-encode
credentials and preserve the existing private runtime's escaping.

## Image and first-start qualification

1. Inspect the source version, table engines, charset/collation, authentication
   plugins, timezone data, routines, triggers and events. Choose a compatible
   official `mysql` image **by digest**, its target platform and actual mysql
   UID/GID. No image version, architecture, identity or capacity is selected here.
   Verify this image's flags and `_FILE` initialization behavior; do not substitute
   MariaDB or silently upgrade the database major version.
2. Measure CPU, memory, connections and storage growth before filling in
   `database.env.example`. Buffer-pool memory, per-connection allocations and
   operating overhead must fit below the container limit with headroom.
   Choose durable retained storage and free-space monitoring.
3. Prepare a new, empty rehearsal volume owned by the chosen image's mysql
   UID/GID. The non-root container cannot repair arbitrary ownership. Its data,
   /tmp and socket/PID paths are writable; the remaining root filesystem is
   read-only. Existing initialized data skips image bootstrap: changing
   `MYSQL_*` env values neither rotates existing passwords nor imports data.
   Preserve failed initialization for inspection; never delete source data to
   make an initialization retry succeed.
4. Supply a private single-line bootstrap password file readable by that UID.
   A generated random 64-character hex secret avoids SQL/shell quoting issues
   in image initialization. Compose file-backed secrets preserve host ownership;
   do not assume `uid`/`mode` fields fix unreadable files. Bootstrap creates
   only the local root administrator; `MYSQL_ROOT_HOST=localhost` prevents
   creation of a remote root account. Audit restored grants rather than importing
   source system users or unrestricted administrators.
5. Supply `ca.crt`, `server.crt` and `server.key` before startup. The
   certificate must cover `du-mysql` here, or the actual Render private hostname
   there. Keep the key readable only by the database identity. The application
   receives the public CA certificate, never the key. Network connections require
   TLS 1.2 or 1.3. MySQL X protocol and server-side file import/export are disabled;
   no public administration endpoint is added.
6. From `du-platform-backend`, validate privately with
   `docker compose --env-file <private-env> -f deploy/database/compose.database.yaml --profile candidate-database config --quiet`.
   Never print resolved private configuration. Start only the isolated database
   after the preceding review. No script here automatically imports data, creates
   app users, applies migrations or changes the selected primary.

The local `mysqladmin ping` probe is process liveness. It can succeed after an
authentication denial and during temporary initialization; it does not prove a
completed restore or app access. Require final image startup, an authenticated
TLS query using the intended app account, and DU's real `/api/health/db`
readiness before accepting the target.

## Restore, grants and single-primary cutover

Restore a consistent MySQL backup into the disposable candidate. A
`mysqldump --single-transaction` strategy requires transactional tables without
concurrent DDL; preserve required routines, triggers, events and character settings.
Do not blindly restore the source `mysql` system database. Provision a scoped
DU app account with `REQUIRE SSL`, only necessary privileges on DU's database,
and no global administrative grants. Current app startup performs schema/seed
work using that same connection, so it needs the required DDL privileges on its
own schema. A separate runtime/migration credential split is not implemented
by this candidate.

Verify restored records, identity/account behavior, allowed and denied TLS
certificates/hostnames, plaintext rejection, scoped grants, resource use, restart
and container-recreation persistence. Take and independently restore another
database-native backup. Only then pause source writers/outbound jobs, take the
final consistent copy and coordinate the single-primary cutover. Preserve the
old DB and compatible image; new writes must be reconciled before switching back.

Retain encrypted backups outside both Oracle and the Render service with
separately retained keys, a reviewed retention policy and recovery objective.
Tighter recovery points need a qualified binlog/PITR scheme. No external backup
provider is chosen here. Backblaze B2, if selected later, stores backup objects;
it is not a live MySQL database.

## Render boundary and evidence

The [Render API candidate](../render/README.md) keeps Aiven. Render does not run
this Compose project or turn its external named volume into a Render disk.
A database container there needs a separately reviewed **paid private service**
and paid persistent disk mounted at the real `/var/lib/mysql` data directory,
with correct ownership, capacity and TLS/secret provisioning. Use its actual
private hostname in both the certificate and API connection. `du-mysql` is only
a Compose network alias. No free durable database or purchase is promised.
The API container's ephemeral filesystem and disk snapshots are not substitutes
for a durable database and database-consistent backup/restore.

Run `python3 deploy/database/test_configuration.py --require-compose` from
`du-platform-backend`. CI adds source boundaries and actual Compose rendering
with synthetic temporary inputs; no DB image is pulled or started by this check.
The existing provider tests remain part of normal backend tests. An offline or
configuration pass does not establish image initialization, actual TLS behavior,
restore integrity or a live migration. The current Oracle-before-Vercel and
draft-preview safety gates remain mandatory.

Primary references:
[official MySQL image](https://github.com/docker-library/docs/blob/master/mysql/README.md),
[official initialization](https://github.com/docker-library/mysql/blob/master/docker-entrypoint.sh),
[Render MySQL](https://render.com/docs/deploy-mysql), and
[Render persistent disks](https://render.com/docs/disks).
