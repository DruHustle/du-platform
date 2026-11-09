import { pathToFileURL } from "node:url";

export const ORACLE_API_ORIGIN = "https://du-api.152-70-22-84.sslip.io";
export const TRACKED_API_ORIGIN = "https://du-platform-api.onrender.com";
export const PUBLIC_SITE_ORIGIN = "https://www.diasporaunlocked.com";
export const SOURCE_REPOSITORY = "https://github.com/DruHustle/du-platform";

export function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function testedRevision(value) {
  requireCondition(
    typeof value === "string" && /^[a-f0-9]{40}$/.test(value),
    "Set EXPECTED_REVISION to the full tested commit SHA."
  );
  return value;
}

export function canonicalRenderOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    /* Report one safe configuration error below. */
  }
  requireCondition(
    typeof value === "string" &&
      parsed?.origin === value &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com$/.test(
        parsed.hostname
      ),
    "DU_RENDER_API_ORIGIN must be the canonical HTTPS onrender.com service origin, without a path, credentials, port, query or fragment."
  );
  return value;
}

// Opt-in is deliberate. Adding a Blueprint or a prepared Render service never
// moves customer traffic while the durable database and secrets are incomplete.
export function backendTarget(env = process.env) {
  const provider = env.DU_BACKEND_HOST || "oracle";
  requireCondition(
    provider === "oracle" || provider === "render",
    "DU_BACKEND_HOST must be oracle or render."
  );
  if (provider === "oracle") return { provider, origin: ORACLE_API_ORIGIN };
  const origin = canonicalRenderOrigin(env.DU_RENDER_API_ORIGIN);
  requireCondition(
    /^srv-[a-z0-9]{20}$/.test(env.DU_RENDER_SERVICE_ID || ""),
    "Set DU_RENDER_SERVICE_ID to the verified Render service ID."
  );
  requireCondition(
    /^tea-[a-z0-9]{20}$/.test(env.DU_RENDER_WORKSPACE_ID || ""),
    "Set DU_RENDER_WORKSPACE_ID to the confirmed Render workspace ID."
  );
  return {
    provider,
    origin,
    serviceId: env.DU_RENDER_SERVICE_ID,
    workspaceId: env.DU_RENDER_WORKSPACE_ID,
  };
}

export function validDeployId(value) {
  return typeof value === "string" && /^dep-[a-z0-9]{20}$/.test(value);
}

export function assertRenderService(service, target) {
  requireCondition(
    service?.id === target.serviceId && service?.ownerId === target.workspaceId,
    "Render service and workspace must match the configured deployment target."
  );
  requireCondition(
    service.type === "web_service" && service.serviceDetails?.plan === "free",
    "The selected DU Render service must be a free web service."
  );
  requireCondition(
    typeof service.repo === "string" &&
      service.repo.replace(/\.git$/, "") === SOURCE_REPOSITORY &&
      service.branch === "main",
    "Render must build the DU repository's main branch."
  );
  const relative = value =>
    typeof value === "string"
      ? value.replace(/^\.\//, "").replace(/\/$/, "")
      : "";
  const details = service.serviceDetails;
  const rootDir = service.rootDir ?? "";
  const dockerRoot =
    typeof rootDir === "string" &&
    ["", "."].includes(relative(rootDir)) &&
    details.runtime === "docker" &&
    relative(details.envSpecificDetails?.dockerContext) ===
      "du-platform-backend" &&
    relative(details.envSpecificDetails?.dockerfilePath) ===
      "du-platform-backend/deploy/render/Dockerfile";
  requireCondition(
    relative(service.rootDir) === "du-platform-backend" || dockerRoot,
    "Render must build only du-platform-backend, using its root directory or the explicit Render Docker context."
  );
  requireCondition(
    details.url === target.origin,
    "The configured Render origin does not belong to the selected service."
  );
  requireCondition(
    service.autoDeploy === "no" &&
      (!service.autoDeployTrigger || service.autoDeployTrigger === "off"),
    "Disable Render automatic deploys; the tested GitHub Actions release owns deployment."
  );
  requireCondition(
    service.suspended === "not_suspended",
    "The selected Render service is suspended."
  );
}

export async function verifyBackendOrigin(
  origin,
  revision,
  { fetcher = fetch, allowColdStart = false } = {}
) {
  testedRevision(revision);
  // Callers provide a validated target or the fixed public site. No arbitrary
  // private URL is accepted by the production command-line entry points.
  for (const route of ["/api/ping", "/api/health/db", "/api/ai/ready"]) {
    // Render keeps an idle free deployment marked live while waking its process.
    // Give only the initial ping a bounded wake window; all acceptance checks
    // and the later dependency deadlines remain unchanged.
    const timeoutMs = allowColdStart && route === "/api/ping" ? 90_000 : 30_000;
    const response = await fetcher(origin + route, {
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "Cache-Control": "no-cache", Accept: "application/json" },
    });
    requireCondition(
      response.status === 200,
      `Backend readiness failed at ${route}: HTTP ${response.status}.`
    );
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Backend readiness returned invalid JSON at ${route}.`);
    }
    if (route === "/api/ping") {
      requireCondition(
        body?.ok === true && body.service === "du-platform",
        "The selected origin did not identify the DU backend."
      );
      requireCondition(
        body.commit === revision,
        "The published backend does not match the exact tested commit."
      );
    } else if (route === "/api/health/db") {
      requireCondition(
        body?.ok === true && body.mode === "mysql",
        "The backend's durable MySQL database is not ready."
      );
    } else {
      requireCondition(
        body?.ready === true,
        "Onesa must be ready before production publication."
      );
    }
  }
}

export async function productionProxy(config, env = process.env, options = {}) {
  const target = backendTarget(env);
  const revision = testedRevision(env.EXPECTED_REVISION);
  const apiRules =
    config.rewrites?.filter(rule => rule.source?.startsWith("/api")) || [];
  requireCondition(
    config.buildCommand?.startsWith("VITE_API_URL=/api ") &&
      config.git?.deploymentEnabled === false,
    "Production source must retain same-origin browser API routing and GitHub Actions deployment ownership."
  );
  requireCondition(
    apiRules.length === 1 &&
      apiRules[0].source === "/api/:path*" &&
      apiRules[0].destination === `${TRACKED_API_ORIGIN}/api/:path*`,
    "Production source must start from the tracked Render proxy, with exactly one API rule."
  );
  if (target.provider === "render") {
    requireCondition(
      env.VERIFIED_BACKEND_REVISION === revision &&
        env.VERIFIED_RENDER_ORIGIN === target.origin &&
        env.VERIFIED_RENDER_SERVICE_ID === target.serviceId &&
        env.VERIFIED_RENDER_WORKSPACE_ID === target.workspaceId &&
        validDeployId(env.VERIFIED_RENDER_DEPLOY_ID),
      "Render proxy cutover requires matching revision, origin, workspace, service and deployment evidence from the successful Render release job."
    );
  }
  // Check again immediately before preparing the production source. A previous
  // successful job is not enough if another deployment has since replaced it.
  await verifyBackendOrigin(target.origin, revision, {
    ...options,
    allowColdStart: target.provider === "render",
  });
  const prepared = structuredClone(config);
  prepared.rewrites.find(rule => rule.source === "/api/:path*").destination =
    `${target.origin}/api/:path*`;
  return prepared;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const target = backendTarget();
  console.log(`Validated production backend selection: ${target.provider}`);
}
