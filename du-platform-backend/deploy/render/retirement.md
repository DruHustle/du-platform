# Render-only runtime and recovery handoff

DU remains the standalone `DruHustle/du-platform` application. Its production
backend belongs on the existing free Render web service. No DU runtime, worker,
database or image import should be installed on an Onesa or Oracle VM.

## Existing runtime contract

The web process starts all three delivery consumers. Each queue uses a MySQL
advisory lock, durable processing state and stable provider idempotency keys.
The provider is Resend over HTTPS; SMTP is not used. A free Render web service
can run these consumers while awake, but idle suspension and restarts delay
processing. Neither a separate paid worker nor artificial keepalive is part of
this handoff. Do not promise continuous delivery on the free plan.

Keep `DATABASE_STARTUP_MODE=verify`. This checks the existing database without
startup DDL or seed writes. Keep the same external database, sender settings,
recipient configuration and `JWT_SECRET`. `resolveJwtSecret()` trims that
secret; existing order-access grants and encrypted transactional payloads derive
their AES-GCM key from it. Presence or length alone cannot prove key continuity.
An owner can compare a one-operation nonce HMAC privately and retain only the
equality result. Do not export the secret, persist the comparison proof, rotate
the key or add a public secret-comparison endpoint.

## Consumer cutover

1. Qualify the existing Render service and exact tested source while
   `OUTBOUND_MESSAGES_PAUSED=true`. Confirm the durable database, provider
   configuration and retained key. Preserve the old configuration and encrypted
   backup custody separately.
2. Inspect aggregate queue state without recipients, payloads, new jobs or
   provider calls. Recheck pending, processing and uncertain deliveries at the
   cutover fence; preserve any legitimate newly queued work for normal delivery.
3. Retire the old release timer and verify its service is inactive. Never
   terminate an active old deploy: its signal traps can restore and start the
   old Compose application. Coordinate the existing recovery lock before the
   deploy lock, following the retained recovery script's order.
4. Stop the exact old application and prevent its automatic restart. Verify it
   and any replacement are stopped before enabling the Render consumer. Retain
   the original restart/controller state for controlled rollback.
5. Change only `OUTBOUND_MESSAGES_PAUSED` to `false` through the normal Render
   deployment of the qualified source. Wait for that deployment to become live
   and verify the normal liveness/database/frontend paths. Do not force a drain,
   insert test requests or send test mail. Provider acceptance is distinct from
   delivery to an inbox.

Before final retirement, emergency recovery of an interrupted handoff must first
deploy Render with outbound messages paused and observe that deployment live
with the intended configuration. Only then may the retained old consumer be
temporarily restored to recover the handoff. This is not an ongoing VM hosting
option: finish the Render-only handoff before removing that recovery custody.
Do not reactivate both independently. Current public HTTP routing and the queued
job history remain separate from host placement.

## Backup continuity

The historical `/usr/local/sbin/du-platform-mac-backup` adapter has separate
`inventory`, `read` and `create` operations. The first two can preserve existing
encrypted files while the old application is stopped. `create` requires the old
DU container and Docker restore tools and is not a Render-compatible scheduler.

Preserve every existing archive/report pair byte for byte. Five observed
October 25 reports predate the stored archive-digest field; they retain matching
timestamps and sizes. A new transfer digest verifies custody, not a historical
stored-hash match or a new restore. The other observed reports contain hashes
that can be checked normally. Never discard older archives to simplify a
migration or put the existing passphrase/JWT key in the archive folder.

The owner-device schedule currently invokes that SSH adapter. Its continuation
must be changed to read the external Aiven database directly using existing
private credentials, verified TLS and the retained encryption key, or to an
already available managed backup mechanism. Preserve the existing isolated
restore and application checks when extracting a portable adapter. This source
change does not claim that the owner-device configuration, independent key
recovery or a new backup/restore has been completed. Retain the old encrypted
custodian until that handoff is observed; keeping archive files temporarily is
separate from keeping an application hosted there.

## Frontend placement

The backend remains independently deployable. The remaining frontend handoff is
a free Render Static Site from the same standalone repository. Render supports
full-URL rewrite destinations, allowing same-origin `/api/*` forwarding to the
verified Render backend. Preserve existing route documents, redirects, security
headers, cache controls, source identity and post-deployment checks before moving
the canonical domain. Do not replace an accepted frontend with an unqualified
static build merely because the backend is already on Render.

References: [free-service behavior](https://render.com/docs/free),
[deployment lifecycle](https://render.com/docs/deploys),
[static-site rewrites](https://render.com/docs/redirects-rewrites).
