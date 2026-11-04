import {
  backendTarget,
  PUBLIC_SITE_ORIGIN,
  testedRevision,
  verifyBackendOrigin,
} from "../lib/backend-deployment.mjs";

const flags = process.argv.slice(2);
if (flags.length > 1 || (flags.length === 1 && flags[0] !== "--direct"))
  throw new Error(
    "The only optional release verification argument is --direct."
  );
const revision = testedRevision(process.env.EXPECTED_REVISION);
const target = backendTarget();
const origins =
  flags[0] === "--direct"
    ? [target.origin]
    : [target.origin, PUBLIC_SITE_ORIGIN];
for (const origin of origins) {
  await verifyBackendOrigin(origin, revision, {
    allowColdStart: target.provider === "render",
  });
  console.log(
    `PASS ${origin}: exact tested revision, durable database and Onesa ready`
  );
}
