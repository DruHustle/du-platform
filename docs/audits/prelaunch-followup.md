# Prelaunch basket, information and Mac backup follow-up

26 October 2026. Reviewed protected main and live API baseline:
`c65bc3ac75bd8dfc481169558ad45cad8298d356` (PR #136). Both matched before edits;
the worktree was clean. This is a focused follow-up, not commercial activation.
The PR/CI release record carries the eventual merge SHA and post-release checks.

## Findings fixed

- **High customer impact:** the mobile summary added a €12 delivery allowance to
  a saved €44.60 jersey while no checkout was available. In prelaunch or any invalid
  basket it now shows saved-item count only; individual merchandise prices are
  indicative. No payable/estimated total, shipping allowance or address form is
  presented. Valid pilot arithmetic and historical order totals remain intact.
- **Medium:** internal readiness language and repeated alert/payment prose obscured
  the action. Customer notices now explain preparing the shop; prices are labelled
  next to the amount. One-time email confirmation and cancellation are explained
  in the shared interest dialog. Operator/legal links remain accessible. Zero-stock
  removal is explicit. English, German, Shona, Ndebele and initial HTML agree.
- **Medium:** loading, failed and genuinely empty product information were conflated.
  They now have separate states, with keyboard-accessible retry on request failure,
  an unavailable-product state, validated populated details, abort cleanup and stale
  response guards across product navigation. Missing ingredients/specifications are
  never inferred. Unavailable products cannot retain the old interest/quantity UI.
- **Medium operator impact:** expired confirmation requests inflated pending demand.
  Reporting uses server time: pending means expiry strictly after now; at the exact
  48-hour boundary it becomes expired. Active confirmed/waiting sorts first and is
  distinct from cancelled, notified and historically confirmed counts. Latest consent
  date filtering, unique email/product rows, generation-scoped confirmation/cancellation
  and bounded durable retries are preserved. Reporting sends/deletes nothing.
- **High recovery residual:** a verified old Mac copy was not a fresh or recurring
  backup. The reviewed procedure now streams SQL directly into GPG and restores only
  inside a network-isolated, held-worker drill. No plaintext SQL dump file is written.
  A root-owned Oracle adapter and actual-Mac user LaunchAgent create/pull a fresh
  verified snapshot when due, with strict existing SSH host-key verification, atomic
  publication, size/SHA-256 checks and macOS shasum. Prior good copies and Oracle
  originals/retention are preserved. Offline failures retry, an exclusive lock prevents
  overlap, and visible `BACKUP-STATUS.json` preserves last success plus newer failures.

## Actual operational evidence

The pre-release snapshot/pull completed on the actual Darwin/arm64 Mac at
**26 October 00:31:44 CET** (25 October 23:31:44 UTC). Archive:
`DiasporaUnlocked/20261025T233142Z/20261025T233142Z.sql.gpg`, 10,530 bytes.
Source and download SHA-256 match; macOS shasum passes. The current-schema Oracle
restore compared **37 tables / 132 rows**, schema/row fingerprints and application
recovery checks. Production writes, external integrations and outbound workers
were disabled in the restore environment. Synthetic encrypted grants/queued
payloads recovered with the retained fixture key; wrong-key recovery failed.

Approved base: `/Users/andrewgotora/Software Development/Backups/DiasporaUnlocked`.
The earlier five encrypted archives were rechecked and remain intact. No key,
password, plaintext dump or runtime secret was copied to this folder. Files are
0600; directories are 0700. The installed LaunchAgent completed successfully with
exit 0. Default interval is 24 hours; login/hourly/calendar due checks provide
catch-up while awake and connected. This is not an unattended always-on host.

The runbook distinguishes snapshot creation, isolated restoration, transfer and
checksum evidence. Post-release fresh-snapshot/deployed-revision evidence belongs
in the PR release handover, rather than treating this pre-release timestamp as a
newer snapshot. See [operations](../assisted-order-operations.md) for status,
configuration, manual pull, installation and pending USB custody steps.

## Verification and release

- Backend/frontend types, strict four-language translations, production build,
  guardrails, dependency audit and initial HTML/SEO checks pass.
- 297 backend tests pass with no skips; 106 frontend tests plus seven Node checks pass.
- Disposable MySQL regressions cover the exact 48-hour boundary, concurrent explicit
  re-registration, old-token rejection, cancellation, active/historical counts and
  inclusive UTC date bounds. Mock email providers only; no real subscribers contacted.
- 88 Chromium/WebKit focused scenarios pass; 98 existing HTTP/MySQL prelaunch scenarios
  and both historical assisted-order engines pass. Focused scenarios cover mobile/desktop × all four languages ×
  prelaunch zero/positive stock, unavailable and partially invalid baskets, valid
  pilot arithmetic, explicit removal, slow/empty/populated/failed/retried information,
  withdrawn products and stale navigation responses. Screenshots are reviewed.
- Ten Mac safety tests cover overlap, offline recovery, corruption/source mutation,
  stale snapshots, existing-copy preservation, symlink/non-Mac rejection, pinned SSH,
  paths containing spaces and launch scheduling. Actual LaunchAgent and shasum
  verification supplement mocks. Controlled custody/application recovery tests pass.
- Existing stale-basket, historical assisted-order, CSP, preview isolation, protected
  main and exact Oracle/Vercel revision checks remain required in CI. No safeguards
  are removed. Merge/release only through the existing successful workflow.

Changed files pass formatting. The repository-wide formatting command still reports
82 pre-existing files outside this change; its existing non-blocking CI behavior
is preserved rather than hiding warnings or mass-formatting unrelated code.

The snapshot shares the existing Oracle release lock. An actual lock-contention
probe verifies that it refuses to run during a release without altering archives;
the daily pull retries later. This prevents mixed image/schema revision evidence.

No database migration is needed for this follow-up. Rollback keeps all current
interest/consent/outbox columns and enforced prelaunch; prefer forward fixes. Mac
pull scheduling is independent of application release. To pause it deliberately,
boot out only `com.diasporaunlocked.backup-pull` from the user's launchd domain;
preserve archives, status, keys and Oracle services. Do not restore an old database
over newer consent/orders or roll back to synchronous unconfirmed alert code.

## Remaining inputs and next step

Andrew Gotora is the named custodian. Separate encrypted USB device/secure custody
identifier, independent unlock/recovery arrangements and the verified public GPG
key location/full fingerprint remain pending. No device, fingerprint, key transfer,
independent off-host restore, provider PITR or full-host-loss result is invented.

Keep enforced prelaunch: no physical stock, verified costs or live card gateway.
Use the existing [28-day experiment](../product-demand-sourcing.md): review **active
confirmed** interest weekly, shortlist up to five products and gather actual
supplier, item/variant/label, packaging, dimensions/weight, DHL eligibility/rate,
merchant/tax and contribution evidence. Counts are research signals, not sales or
purchase authority. Then payment sandbox/operational acceptance precedes a bounded
paid pilot. No stock purchase or supplier commitment is made here.
