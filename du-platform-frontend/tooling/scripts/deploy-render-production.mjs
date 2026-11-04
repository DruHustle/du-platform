import fs from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import {
  assertRenderService,
  backendTarget,
  requireCondition,
  testedRevision,
  validDeployId,
  verifyBackendOrigin,
} from "./lib/backend-deployment.mjs";

// Render's documented commitId API does not disable automatic deploys. Verify
// the service identity and auto-deploy setting before making this one mutation.
// https://api-docs.render.com/reference/create-deploy
// https://api-docs.render.com/reference/retrieve-deploy
const pendingStatuses = new Set([
  "created",
  "queued",
  "build_in_progress",
  "pre_deploy_in_progress",
  "update_in_progress",
]);
const failedStatuses = new Set([
  "deactivated",
  "build_failed",
  "pre_deploy_failed",
  "update_failed",
  "canceled",
]);
const knownStatuses = new Set(["live", ...pendingStatuses, ...failedStatuses]);

export async function deployRender({
  env = process.env,
  fetcher = fetch,
  wait = setTimeout,
  now = Date.now,
  log = console.log,
  timeoutMs = 20 * 60_000,
} = {}) {
  const target = backendTarget(env);
  requireCondition(
    target.provider === "render",
    "Render deployment requires explicit DU_BACKEND_HOST=render."
  );
  const revision = testedRevision(env.EXPECTED_REVISION);
  requireCondition(
    typeof env.RENDER_API_KEY === "string" &&
      env.RENDER_API_KEY.trim().length > 0,
    "Set the RENDER_API_KEY GitHub Actions secret before enabling Render deployment."
  );
  const api = async (suffix, body) => {
    let response;
    try {
      response = await fetcher(
        `https://api.render.com/v1/services/${target.serviceId}${suffix}`,
        {
          method: body === undefined ? "GET" : "POST",
          redirect: "error",
          signal: AbortSignal.timeout(30_000),
          headers: {
            Authorization: `Bearer ${env.RENDER_API_KEY}`,
            Accept: "application/json",
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }
      );
    } catch {
      throw new Error(
        body === undefined
          ? "Could not read Render deployment state."
          : "Render deploy acceptance could not be confirmed. Inspect the service before retrying; no automatic retry was sent."
      );
    }
    requireCondition(
      [200, 201, 202].includes(response.status),
      `Render deployment request failed: HTTP ${response.status}.`
    );
    try {
      return await response.json();
    } catch {
      throw new Error(
        body === undefined
          ? "Render returned an invalid deployment response."
          : "Render accepted the request without an identifiable deploy response. Inspect the service before retrying; no automatic retry was sent."
      );
    }
  };

  assertRenderService(await api(""), target);
  const entries = await api("/deploys?limit=20");
  requireCondition(
    Array.isArray(entries),
    "Render deploy history was invalid."
  );
  const deployments = entries.map(entry => entry?.deploy);
  requireCondition(
    deployments.every(deploy => knownStatuses.has(deploy?.status)),
    "Render deploy history contains an unknown state; no new deployment was requested."
  );
  // A long-running deploy can fall outside the newest history page after later
  // failed/canceled triggers. Query active states directly before any mutation.
  // Two results are enough to reject overlapping releases, even with more pages.
  const activeQuery = new URLSearchParams({ limit: "2" });
  for (const status of pendingStatuses) activeQuery.append("status", status);
  const activeEntries = await api(`/deploys?${activeQuery}`);
  requireCondition(
    Array.isArray(activeEntries),
    "Render active deploy history was invalid."
  );
  const active = activeEntries.map(entry => entry?.deploy);
  requireCondition(
    active.every(deploy => pendingStatuses.has(deploy?.status)),
    "Render active deploy history contains an unexpected state; no new deployment was requested."
  );
  requireCondition(
    active.length <= 1 &&
      active.every(deploy => deploy.commit?.id === revision),
    "Another Render revision is deploying or queued. Wait for it to finish before retrying this release."
  );
  let current = deployments.find(deploy => deploy.status === "live");
  if (!active.length && !current) {
    // A current live release can likewise be older than twenty failed attempts.
    // Preserve same-commit rerun idempotency instead of building it a second time.
    const liveEntries = await api("/deploys?limit=1&status=live");
    requireCondition(
      Array.isArray(liveEntries) &&
        liveEntries.length <= 1 &&
        liveEntries.every(entry => entry?.deploy?.status === "live"),
      "Render live deploy history was invalid; no new deployment was requested."
    );
    current = liveEntries[0]?.deploy;
  }
  let deployment =
    active[0] || (current?.commit?.id === revision ? current : null);
  if (!deployment)
    deployment = await api("/deploys", {
      commitId: revision,
      clearCache: "do_not_clear",
    });
  requireCondition(
    validDeployId(deployment?.id),
    "Render did not return a valid deploy ID; Vercel remains blocked."
  );
  const deployId = deployment.id;
  const deadline = now() + timeoutMs;
  let lastStatus;
  while (true) {
    requireCondition(
      deployment.id === deployId && deployment.commit?.id === revision,
      "Render deploy metadata does not match the exact tested commit."
    );
    requireCondition(
      knownStatuses.has(deployment.status),
      "Render returned an unknown deployment state; Vercel remains blocked."
    );
    if (deployment.status !== lastStatus) {
      log(`Render deploy ${deployId}: ${deployment.status}`);
      lastStatus = deployment.status;
    }
    if (deployment.status === "live") break;
    requireCondition(
      !failedStatuses.has(deployment.status),
      `Render deployment ended with ${deployment.status}; Vercel remains blocked.`
    );
    requireCondition(
      now() < deadline,
      "Render did not publish the tested revision before the deadline; Vercel remains blocked."
    );
    await wait(Math.min(15_000, deadline - now()));
    deployment = await api(`/deploys/${deployId}`);
  }
  // A live Render state alone does not prove database or application readiness.
  await verifyBackendOrigin(target.origin, revision, {
    fetcher,
    allowColdStart: true,
  });
  log(`Render DU release verified: ${revision}`);
  return {
    revision,
    origin: target.origin,
    serviceId: target.serviceId,
    workspaceId: target.workspaceId,
    deployId,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await deployRender();
    if (process.env.GITHUB_OUTPUT)
      await fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `revision=${result.revision}\norigin=${result.origin}\nservice_id=${result.serviceId}\nworkspace_id=${result.workspaceId}\ndeploy_id=${result.deployId}\n`
      );
  } catch (error) {
    // Do not print API response bodies, request options or credentials.
    console.error(
      error instanceof Error
        ? error.message
        : "Render deployment could not be verified."
    );
    process.exitCode = 1;
  }
}
