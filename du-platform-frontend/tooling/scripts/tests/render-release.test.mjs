import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { deployRender } from "../deploy-render-production.mjs";
import {
  assertRenderService,
  backendTarget,
  canonicalRenderOrigin,
  productionProxy,
  SOURCE_REPOSITORY,
  testedRevision,
  verifyBackendOrigin,
} from "../lib/backend-deployment.mjs";

const revision = "a".repeat(40),
  oldRevision = "b".repeat(40);
const serviceId = `srv-${"a".repeat(20)}`,
  workspaceId = `tea-${"b".repeat(20)}`,
  deployId = `dep-${"c".repeat(20)}`;
const origin = "https://du-release-fixture.onrender.com";
const retiredOracleOrigin = "https://du-api.152-70-22-84.sslip.io";
const env = {
  DU_BACKEND_HOST: "render",
  DU_RENDER_API_ORIGIN: origin,
  DU_RENDER_SERVICE_ID: serviceId,
  DU_RENDER_WORKSPACE_ID: workspaceId,
  EXPECTED_REVISION: revision,
  RENDER_API_KEY: "fixture-key-never-a-real-secret",
};
const proof = {
  VERIFIED_BACKEND_REVISION: revision,
  VERIFIED_RENDER_ORIGIN: origin,
  VERIFIED_RENDER_SERVICE_ID: serviceId,
  VERIFIED_RENDER_WORKSPACE_ID: workspaceId,
  VERIFIED_RENDER_DEPLOY_ID: deployId,
};
const repository = process.cwd();
const config = JSON.parse(
  await fs.readFile("du-platform-frontend/web/vercel.json", "utf8")
);
const workflow = await fs.readFile(".github/workflows/ci-cd.yml", "utf8");
const script = name =>
  path.join(repository, "du-platform-frontend/tooling/scripts", name);
const response = (body, status = 200) => ({
  status,
  json: async () => structuredClone(body),
});
const deployment = (status = "live", commit = revision) => ({
  id: deployId,
  status,
  commit: { id: commit },
});
const pendingStatuses = [
  "created",
  "queued",
  "build_in_progress",
  "pre_deploy_in_progress",
  "update_in_progress",
];
const activeQuery = new URLSearchParams({ limit: "2" });
for (const status of pendingStatuses) activeQuery.append("status", status);
const activeSuffix = `/deploys?${activeQuery}`;
const readyBodies = {
  "/api/ping": { ok: true, service: "du-platform", commit: revision },
  "/api/health/db": { ok: true, mode: "mysql" },
  "/api/ai/ready": { ready: true },
};
function service() {
  return {
    id: serviceId,
    ownerId: workspaceId,
    type: "web_service",
    repo: SOURCE_REPOSITORY,
    branch: "main",
    rootDir: "du-platform-backend",
    autoDeploy: "no",
    autoDeployTrigger: "off",
    suspended: "not_suspended",
    serviceDetails: { plan: "free", runtime: "node", url: origin },
  };
}
function readyFetcher(overrides = {}, calls = [], expectedOrigin = origin) {
  return async (url, options) => {
    calls.push({ url, options });
    assert.equal(
      new URL(url).origin,
      expectedOrigin,
      "Readiness must use only the selected host"
    );
    const route = new URL(url).pathname;
    assert(Object.hasOwn(readyBodies, route), "Unexpected readiness endpoint");
    return overrides[route] ?? response(readyBodies[route]);
  };
}
function renderFixture({
  metadata = service(),
  history = [],
  activeHistory,
  liveHistory = [],
  accepted = deployment("queued"),
  updates = [deployment("live")],
  ready = {},
  postError,
  postResponse,
} = {}) {
  const calls = [],
    waits = [],
    logs = [];
  let clock = 0,
    update = 0;
  const application = readyFetcher(ready);
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (new URL(url).origin !== "https://api.render.com")
      return application(url, options);
    const base = `https://api.render.com/v1/services/${serviceId}`;
    if (url === base) return response(metadata);
    if (url === base + "/deploys?limit=20") return response(history);
    if (url === base + activeSuffix)
      return response(
        activeHistory ??
          history.filter(entry =>
            pendingStatuses.includes(entry?.deploy?.status)
          )
      );
    if (url === base + "/deploys?limit=1&status=live")
      return response(liveHistory);
    if (url === base + "/deploys" && options.method === "POST") {
      if (postError) throw postError;
      return postResponse ?? response(accepted, 201);
    }
    assert.equal(
      url,
      base + `/deploys/${deployId}`,
      "Only the accepted deployment may be polled"
    );
    return response(updates[Math.min(update++, updates.length - 1)]);
  };
  return {
    calls,
    waits,
    logs,
    run: (options = {}) =>
      deployRender({
        env,
        fetcher,
        log: value => logs.push(value),
        now: () => clock,
        wait: async ms => {
          waits.push(ms);
          clock += ms;
        },
        ...options,
      }),
    posts: () => calls.filter(call => call.options.method === "POST"),
  };
}

test("Render is the only backend and still requires complete explicit service configuration", () => {
  for (const setting of [undefined, "", "render"])
    assert.deepEqual(backendTarget({ ...env, DU_BACKEND_HOST: setting }), {
      provider: "render",
      origin,
      serviceId,
      workspaceId,
    });
  for (const setting of ["oracle", "Render", "other", " render"])
    assert.throws(
      () => backendTarget({ ...env, DU_BACKEND_HOST: setting }),
      /DU_BACKEND_HOST/
    );
  for (const key of [
    "DU_RENDER_API_ORIGIN",
    "DU_RENDER_SERVICE_ID",
    "DU_RENDER_WORKSPACE_ID",
  ])
    assert.throws(() => backendTarget({ ...env, [key]: "" }));
  for (const value of [
    "main",
    oldRevision.slice(0, 7),
    revision.toUpperCase(),
    revision + "\n",
  ])
    assert.throws(() => testedRevision(value), /full tested commit/);
});

test("Render origins reject redirects, alternate hosts and non-canonical URL spellings", () => {
  assert.equal(canonicalRenderOrigin(origin), origin);
  const invalid = [
    "http://du-release-fixture.onrender.com",
    origin + "/",
    origin + "/api",
    origin + "?x=1",
    origin + "#x",
    origin + ":443",
    origin + ":8443",
    "https://user@du-release-fixture.onrender.com",
    "https://user:password@du-release-fixture.onrender.com",
    "https://DU-release-fixture.onrender.com",
    "https://du-release-fixture.onrender.com.",
    "https://du-release-fixture.onrender.com.evil.test",
    "https://nested.du-release-fixture.onrender.com",
    "https://onrender.com",
    "https://127.0.0.1",
    "https://localhost",
    "https://[::1]",
    " " + origin,
    origin + "\n",
    origin + "\\api",
    "https://-bad.onrender.com",
    "https://bad-.onrender.com",
    `https://${"a".repeat(64)}.onrender.com`,
  ];
  for (const value of invalid)
    assert.throws(() => canonicalRenderOrigin(value), /canonical HTTPS/, value);
});

test("configuration and secret failures happen before any Render request", async () => {
  for (const changed of [
    { DU_BACKEND_HOST: "oracle" },
    { EXPECTED_REVISION: "main" },
    { RENDER_API_KEY: "" },
    { DU_RENDER_SERVICE_ID: "srv-other\n" },
    { DU_RENDER_WORKSPACE_ID: "wrong" },
    { DU_RENDER_API_ORIGIN: "http://localhost" },
  ]) {
    const fixture = renderFixture();
    await assert.rejects(fixture.run({ env: { ...env, ...changed } }));
    assert.equal(fixture.calls.length, 0);
  }
});

test("wrong service identity, paid compute or automatic deploys cannot trigger a release", async t => {
  const cases = {
    workspace: value => {
      value.ownerId = `tea-${"c".repeat(20)}`;
    },
    service: value => {
      value.id = `srv-${"b".repeat(20)}`;
    },
    repository: value => {
      value.repo = "https://github.com/other/du-platform";
    },
    branch: value => {
      value.branch = "develop";
    },
    root: value => {
      value.rootDir = "du-platform-frontend";
    },
    hostname: value => {
      value.serviceDetails.url = "https://other.onrender.com";
    },
    type: value => {
      value.type = "private_service";
    },
    plan: value => {
      value.serviceDetails.plan = "starter";
    },
    autoDeploy: value => {
      value.autoDeploy = "yes";
    },
    trigger: value => {
      value.autoDeployTrigger = "checksPass";
    },
    suspended: value => {
      value.suspended = "suspended";
    },
    missingDetails: value => {
      delete value.serviceDetails;
    },
  };
  for (const [name, mutate] of Object.entries(cases))
    await t.test(name, async () => {
      const metadata = service();
      mutate(metadata);
      const fixture = renderFixture({ metadata });
      await assert.rejects(fixture.run());
      assert.equal(
        fixture.calls.length,
        1,
        "Reject before reading deployment history or creating a release"
      );
      assert.equal(fixture.posts().length, 0);
    });
});

test("an unset Render root is accepted only with the exact backend Docker context", () => {
  for (const rootDir of [undefined, null, "", ".", "./"]) {
    const metadata = service();
    metadata.rootDir = rootDir;
    metadata.serviceDetails.runtime = "docker";
    metadata.serviceDetails.envSpecificDetails = {
      dockerContext: "./du-platform-backend/",
      dockerfilePath: "./du-platform-backend/deploy/render/Dockerfile",
    };
    assert.doesNotThrow(() =>
      assertRenderService(metadata, backendTarget(env))
    );
    for (const field of ["dockerContext", "dockerfilePath"]) {
      const unsafe = structuredClone(metadata);
      unsafe.serviceDetails.envSpecificDetails[field] =
        "../du-platform-backend";
      assert.throws(
        () => assertRenderService(unsafe, backendTarget(env)),
        /only du-platform-backend/
      );
    }
    metadata.serviceDetails.runtime = "node";
    assert.throws(
      () => assertRenderService(metadata, backendTarget(env)),
      /only du-platform-backend/
    );
  }
});

test("release deploys the exact tested SHA and emits evidence only after live application readiness", async () => {
  const fixture = renderFixture({
    updates: [
      deployment("build_in_progress"),
      deployment("update_in_progress"),
      deployment("live"),
    ],
  });
  assert.deepEqual(await fixture.run(), {
    revision,
    origin,
    serviceId,
    workspaceId,
    deployId,
  });
  assert.equal(fixture.posts().length, 1);
  assert.deepEqual(JSON.parse(fixture.posts()[0].options.body), {
    commitId: revision,
    clearCache: "do_not_clear",
  });
  assert.deepEqual(fixture.waits, [15000, 15000, 15000]);
  assert.deepEqual(
    fixture.calls.slice(-3).map(call => new URL(call.url).pathname),
    Object.keys(readyBodies)
  );
  for (const { url, options } of fixture.calls) {
    assert.equal(options.redirect, "error");
    assert(options.signal instanceof AbortSignal);
    if (new URL(url).origin === "https://api.render.com")
      assert.equal(
        options.headers.Authorization,
        `Bearer ${env.RENDER_API_KEY}`
      );
    else
      assert.equal(
        options.headers.Authorization,
        undefined,
        "Never forward the Render API key to the application"
      );
  }
});

test("reruns reuse the same pending or live commit without a second deployment", async () => {
  for (const status of [
    "created",
    "queued",
    "build_in_progress",
    "pre_deploy_in_progress",
    "update_in_progress",
    "live",
  ]) {
    const fixture = renderFixture({
      history: [{ deploy: deployment(status) }],
    });
    assert.equal((await fixture.run()).deployId, deployId);
    assert.equal(fixture.posts().length, 0, status);
  }
});

test("a different active revision or multiple queued deploys block the release without cancellation", async () => {
  for (const history of [
    [{ deploy: deployment("queued", oldRevision) }],
    [
      { deploy: deployment("build_in_progress") },
      { deploy: deployment("queued") },
    ],
  ]) {
    const fixture = renderFixture({ history });
    await assert.rejects(fixture.run(), /Another Render revision/);
    assert.equal(fixture.posts().length, 0);
  }
});

test("a pending release outside the newest history page cannot be overwritten", async () => {
  const history = Array.from({ length: 20 }, (_, index) => ({
    deploy: deployment(index % 2 ? "canceled" : "build_failed", oldRevision),
    cursor: `page-${index}`,
  }));
  const conflict = renderFixture({
    history,
    activeHistory: [{ deploy: deployment("build_in_progress", oldRevision) }],
  });
  await assert.rejects(conflict.run(), /Another Render revision/);
  assert.equal(conflict.posts().length, 0);
  const activeCall = conflict.calls.find(call =>
    call.url.endsWith(activeSuffix)
  );
  assert(
    activeCall,
    "Inspect pending states independently of the newest unfiltered page"
  );
  const query = new URL(activeCall.url).searchParams;
  assert.equal(query.get("limit"), "2");
  assert.deepEqual(query.getAll("status"), pendingStatuses);

  const matching = renderFixture({
    history,
    activeHistory: [{ deploy: deployment("queued") }],
  });
  assert.equal((await matching.run()).deployId, deployId);
  assert.equal(
    matching.posts().length,
    0,
    "Resume the existing matching deploy instead of creating a duplicate"
  );

  const live = renderFixture({
    history,
    liveHistory: [{ deploy: deployment("live") }],
  });
  assert.equal((await live.run()).deployId, deployId);
  assert.equal(
    live.posts().length,
    0,
    "Reuse the current matching live deploy even outside the newest page"
  );
});

test("invalid or multiple active-deploy results block a new mutation", async () => {
  for (const activeHistory of [
    {},
    [null],
    [{ deploy: deployment("live") }],
    [
      { deploy: deployment("queued") },
      { deploy: deployment("build_in_progress") },
    ],
  ]) {
    const fixture = renderFixture({ activeHistory });
    await assert.rejects(
      fixture.run(),
      /active deploy history|Another Render revision/
    );
    assert.equal(fixture.posts().length, 0);
  }
});

test("invalid live-deploy fallback results cannot authorize a new mutation", async () => {
  for (const liveHistory of [
    {},
    [null],
    [{ deploy: deployment("queued") }],
    [{ deploy: deployment("live") }, { deploy: deployment("live") }],
  ]) {
    const fixture = renderFixture({ liveHistory });
    await assert.rejects(fixture.run(), /live deploy history/);
    assert.equal(fixture.posts().length, 0);
  }
});

test("malformed history and unknown states cannot be mistaken for an idle service", async () => {
  for (const history of [
    {},
    [null],
    [{ deploy: deployment("unrecognized") }],
  ]) {
    const fixture = renderFixture({ history });
    await assert.rejects(fixture.run(), /history/);
    assert.equal(fixture.posts().length, 0);
  }
});

test("stale commits, changed deploy IDs, failed states and timeouts never reach Vercel evidence", async () => {
  const cases = [
    [{ accepted: deployment("live", oldRevision) }, /exact tested commit/],
    [{ updates: [deployment("live", oldRevision)] }, /exact tested commit/],
    [{ accepted: { ...deployment(), id: "dep-invalid" } }, /valid deploy ID/],
    [
      { updates: [{ ...deployment(), id: `dep-${"d".repeat(20)}` }] },
      /exact tested commit/,
    ],
    ...[
      "deactivated",
      "build_failed",
      "pre_deploy_failed",
      "update_failed",
      "canceled",
    ].map(status => [
      { accepted: deployment(status) },
      /Vercel remains blocked/,
    ]),
    [
      { accepted: deployment("unexpected-secret-like-text") },
      /unknown deployment state/,
    ],
    [{ updates: [deployment("queued")] }, /deadline/],
  ];
  for (const [options, error] of cases) {
    const fixture = renderFixture(options);
    await assert.rejects(fixture.run({ timeoutMs: 1 }), error);
    assert(
      fixture.calls.every(
        call => new URL(call.url).origin === "https://api.render.com"
      )
    );
    assert(!fixture.logs.join("\n").includes("unexpected-secret-like-text"));
  }
});

test("ambiguous deploy acceptance is never automatically retried and does not expose API details", async () => {
  for (const options of [
    { postError: new Error(`connection failed with ${env.RENDER_API_KEY}`) },
    {
      postResponse: {
        status: 202,
        json: async () => {
          throw new Error(env.RENDER_API_KEY);
        },
      },
    },
    { postResponse: response({ secret: env.RENDER_API_KEY }, 403) },
  ]) {
    const fixture = renderFixture(options);
    await assert.rejects(fixture.run(), error => {
      assert(!error.message.includes(env.RENDER_API_KEY));
      return /no automatic retry|HTTP 403/.test(error.message);
    });
    assert.equal(fixture.posts().length, 1);
    assert.equal(fixture.waits.length, 0);
  }
});

test("readiness rejects stale identity, missing MySQL, unavailable AI and invalid HTTP responses", async t => {
  const cases = [
    [
      "old revision",
      "/api/ping",
      response({ ...readyBodies["/api/ping"], commit: oldRevision }),
    ],
    [
      "other application",
      "/api/ping",
      response({ ok: true, service: "other", commit: revision }),
    ],
    ["database down", "/api/health/db", response({ ok: false, mode: "mysql" })],
    [
      "memory fallback",
      "/api/health/db",
      response({ ok: true, mode: "memory" }),
    ],
    ["Onesa unavailable", "/api/ai/ready", response({ ready: false })],
    [
      "non-JSON success",
      "/api/ping",
      {
        status: 200,
        json: async () => {
          throw new Error("html");
        },
      },
    ],
    ["redirect", "/api/ping", response({}, 302)],
    ["server unavailable", "/api/health/db", response({}, 503)],
  ];
  for (const [name, route, result] of cases)
    await t.test(name, async () => {
      const fixture = renderFixture({
        accepted: deployment(),
        ready: { [route]: result },
      });
      await assert.rejects(fixture.run());
      assert(
        !fixture.logs.some(log => log.startsWith("Render DU release verified"))
      );
    });
  await assert.rejects(
    verifyBackendOrigin(origin, revision, {
      fetcher: async () => {
        throw new Error("unavailable");
      },
    })
  );
});

test("a sleeping free Render service gets a bounded wake window without extending dependency checks", async () => {
  const limits = new WeakMap();
  const timeout = mock.method(AbortSignal, "timeout", milliseconds => {
    const signal = new AbortController().signal;
    limits.set(signal, milliseconds);
    return signal;
  });
  const calls = [];
  const slowWake = async (url, options) => {
    const route = new URL(url).pathname;
    const limit = limits.get(options.signal);
    calls.push({ route, limit });
    if (route === "/api/ping" && limit < 45_000)
      throw new Error("Cold start exceeded initial request deadline");
    return response(readyBodies[route]);
  };
  try {
    await assert.rejects(
      verifyBackendOrigin(origin, revision, { fetcher: slowWake }),
      /Cold start/
    );
    calls.length = 0;
    await productionProxy(config, { ...env, ...proof }, { fetcher: slowWake });
    assert.deepEqual(calls, [
      { route: "/api/ping", limit: 90_000 },
      { route: "/api/health/db", limit: 30_000 },
      { route: "/api/ai/ready", limit: 30_000 },
    ]);
    calls.length = 0;
    await assert.rejects(
      productionProxy(
        config,
        { EXPECTED_REVISION: revision },
        { fetcher: slowWake }
      ),
      /DU_RENDER_API_ORIGIN/
    );
    assert.deepEqual(calls, [], "Incomplete service identity must fail before any request");
  } finally {
    timeout.mock.restore();
  }
});

test("the release CLI emits matching GitHub job outputs only after complete readiness", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "du-render-output-"));
  try {
    const fetchModule = path.join(dir, "render-api.mjs"),
      output = path.join(dir, "github-output");
    const apiBase = `https://api.render.com/v1/services/${serviceId}`;
    const bodies = {
      [apiBase]: service(),
      [apiBase + "/deploys?limit=20"]: [{ deploy: deployment() }],
      [apiBase + activeSuffix]: [],
      ...Object.fromEntries(
        Object.entries(readyBodies).map(([route, body]) => [
          origin + route,
          body,
        ])
      ),
    };
    await fs.writeFile(
      fetchModule,
      `const bodies = ${JSON.stringify(bodies)};
globalThis.fetch = async (url, options) => {
  if (!(url in bodies) || options.method === 'POST') throw new Error('Unexpected release request');
  const body = process.env.FIXTURE_NOT_READY && url.endsWith('/api/ai/ready') ? {ready:false} : bodies[url];
  return {status:200,json:async()=>body};
};\n`
    );
    const command = [
      "--import",
      fetchModule,
      script("deploy-render-production.mjs"),
    ];
    const childEnv = { PATH: process.env.PATH, ...env, GITHUB_OUTPUT: output };
    const result = spawnSync(process.execPath, command, {
      env: childEnv,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      await fs.readFile(output, "utf8"),
      `revision=${revision}\norigin=${origin}\nservice_id=${serviceId}\nworkspace_id=${workspaceId}\ndeploy_id=${deployId}\n`
    );
    await fs.unlink(output);
    const refused = spawnSync(process.execPath, command, {
      env: { ...childEnv, FIXTURE_NOT_READY: "1" },
      encoding: "utf8",
    });
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /Onesa must be ready/);
    assert(!refused.stderr.includes(env.RENDER_API_KEY));
    await assert.rejects(fs.access(output), { code: "ENOENT" });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("Render proxy changes only the staged API destination after matching evidence and a fresh readiness check", async () => {
  const original = structuredClone(config),
    calls = [];
  const staged = await productionProxy(
    config,
    { ...env, ...proof },
    { fetcher: readyFetcher({}, calls) }
  );
  const expected = structuredClone(config);
  expected.rewrites.find(rule => rule.source === "/api/:path*").destination =
    origin + "/api/:path*";
  assert.deepEqual(staged, expected);
  assert.deepEqual(
    config,
    original,
    "The tracked Render config must remain intact"
  );
  assert.equal(calls.length, 3);
  assert.equal(staged.buildCommand, "VITE_API_URL=/api pnpm build");
});

test("missing or mismatched release evidence blocks proxy preparation before network access", async () => {
  for (const changed of [
    ...Object.keys(proof).map(key => ({ [key]: "" })),
    { VERIFIED_BACKEND_REVISION: oldRevision },
    { VERIFIED_RENDER_ORIGIN: "https://other.onrender.com" },
    { VERIFIED_RENDER_SERVICE_ID: `srv-${"d".repeat(20)}` },
    { VERIFIED_RENDER_WORKSPACE_ID: `tea-${"d".repeat(20)}` },
    { VERIFIED_RENDER_DEPLOY_ID: "dep-invalid\n" },
  ]) {
    const calls = [];
    await assert.rejects(
      productionProxy(
        config,
        { ...env, ...proof, ...changed },
        { fetcher: readyFetcher({}, calls) }
      ),
      /matching revision/
    );
    assert.equal(calls.length, 0);
  }
  await assert.rejects(
    productionProxy(
      config,
      { ...env, ...proof },
      {
        fetcher: readyFetcher({
          "/api/ping": response({
            ...readyBodies["/api/ping"],
            commit: oldRevision,
          }),
        }),
      }
    ),
    /exact tested commit/
  );
});

test("staging rejects direct browser API origins, duplicate proxies and uncontrolled Git deploys", async () => {
  for (const mutate of [
    value => {
      value.buildCommand = `VITE_API_URL=${origin}/api pnpm build`;
    },
    value => {
      value.git.deploymentEnabled = true;
    },
    value => {
      value.rewrites.push({
        source: "/api/admin",
        destination: "https://other.test",
      });
    },
    value => {
      value.rewrites[0].destination = origin + "/api/:path*";
    },
    value => {
      value.rewrites[0].destination = retiredOracleOrigin + "/api/:path*";
    },
  ]) {
    const changed = structuredClone(config),
      calls = [];
    mutate(changed);
    await assert.rejects(
      productionProxy(
        changed,
        { ...env, ...proof },
        { fetcher: readyFetcher({}, calls) }
      )
    );
    assert.equal(calls.length, 0);
  }
});

test("retired Oracle selection cannot prepare a production proxy or make any request", async () => {
  const calls = [];
  const original = structuredClone(config);
  await assert.rejects(
    productionProxy(
      config,
      { ...env, ...proof, DU_BACKEND_HOST: "oracle" },
      {
        fetcher: readyFetcher({}, calls, retiredOracleOrigin),
      }
    ),
    /VM production hosting is retired/
  );
  assert.equal(calls.length, 0);
  assert.deepEqual(config, original);
});

test("the production CLI writes a verified staged proxy and refuses incomplete Render configuration without creating source", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "du-render-stage-"));
  try {
    const fetchModule = path.join(dir, "readiness.mjs"),
      calls = path.join(dir, "calls.jsonl");
    await fs.writeFile(
      fetchModule,
      `import fs from 'node:fs';
const bodies = ${JSON.stringify(readyBodies)};
globalThis.fetch = async (url, options) => {
  if (!url.startsWith(${JSON.stringify(origin + "/api/")}) || options.headers.Authorization) throw new Error('Unexpected readiness request');
  fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(url) + '\\n');
  return {status:200,json:async()=>bodies[new URL(url).pathname]};
};\n`
    );
    const cleanEnv = { PATH: process.env.PATH, ...env, ...proof };
    delete cleanEnv.RENDER_API_KEY;
    const target = path.join(dir, "production");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        fetchModule,
        script("prepare-vercel-source.mjs"),
        target,
        "--production",
      ],
      { env: cleanEnv, encoding: "utf8" }
    );
    assert.equal(result.status, 0, result.stderr);
    const stagedConfigPath = path.join(
      target,
      "du-platform-frontend/web/vercel.json"
    );
    assert.equal(
      JSON.parse(await fs.readFile(stagedConfigPath, "utf8")).rewrites[0]
        .destination,
      origin + "/api/:path*"
    );
    assert.deepEqual(
      JSON.parse(
        await fs.readFile("du-platform-frontend/web/vercel.json", "utf8")
      ),
      config
    );
    assert.equal(
      (await fs.readFile(calls, "utf8")).trim().split("\n").length,
      3
    );
    const failedTarget = path.join(dir, "refused");
    const failed = spawnSync(
      process.execPath,
      [
        "--import",
        fetchModule,
        script("prepare-vercel-source.mjs"),
        failedTarget,
        "--production",
      ],
      {
        env: { ...cleanEnv, VERIFIED_RENDER_DEPLOY_ID: "" },
        encoding: "utf8",
      }
    );
    assert.notEqual(failed.status, 0);
    await assert.rejects(fs.access(failedTarget), { code: "ENOENT" });
    assert.equal(
      (await fs.readFile(calls, "utf8")).trim().split("\n").length,
      3
    );
    const preview = spawnSync(
      process.execPath,
      [script("prepare-preview.mjs"), stagedConfigPath],
      { env: cleanEnv, encoding: "utf8" }
    );
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(
      JSON.parse(await fs.readFile(stagedConfigPath, "utf8")).rewrites[0]
        .destination,
      "/preview-api-unavailable.json"
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("release guardrails reject weakened quality gates, missing cutover proof and hardcoded Render targets", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "du-render-guard-"));
  try {
    await fs.mkdir(path.join(dir, ".github/workflows"), { recursive: true });
    await fs.mkdir(path.join(dir, "du-platform-frontend/web"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(dir, "du-platform-frontend/web/vercel.json"),
      JSON.stringify(config)
    );
    const variants = [
      [workflow, true],
      [
        workflow.replace(
          "needs: [build-and-test, deploy-render-production]",
          "needs: build-and-test"
        ),
        false,
      ],
      [
        workflow.replace(
          'prepare-vercel-source.mjs "$RUNNER_TEMP/du-vercel-stage" --production',
          'prepare-vercel-source.mjs "$RUNNER_TEMP/du-vercel-stage"'
        ),
        false,
      ],
      [
        workflow.replace(
          "VERIFIED_BACKEND_REVISION: ${{ needs.deploy-render-production.outputs.revision }}",
          "VERIFIED_BACKEND_REVISION: ${{ github.sha }}"
        ),
        false,
      ],
      [
        workflow.replace(
          "run: node du-platform-frontend/tooling/scripts/tests/verify-backend-release.mjs\n",
          "run: echo skipped\n"
        ),
        false,
      ],
      [
        workflow + "\n  deploy-oracle-production:\n    name: Retired VM deployment\n",
        false,
      ],
      [workflow.replace("always() && !cancelled()", "always()"), false],
      [
        workflow.replace(
          "DU_RENDER_API_ORIGIN: ${{ vars.DU_RENDER_API_ORIGIN }}",
          `DU_RENDER_API_ORIGIN: ${origin}`
        ),
        false,
      ],
    ];
    for (const [source, valid] of variants) {
      await fs.writeFile(path.join(dir, ".github/workflows/ci-cd.yml"), source);
      const result = spawnSync(
        process.execPath,
        [script("guardrails/check-deploy-guardrails.mjs")],
        {
          cwd: dir,
          env: { PATH: process.env.PATH, ...env },
          encoding: "utf8",
        }
      );
      assert.equal(result.status === 0, valid, result.stderr);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("workflow publishes only a successful Render release after a passing main push", () => {
  const condition = id => {
    const section = workflow
      .split(`  ${id}:\n`)[1]
      .split(/\n  [a-z][a-z0-9-]+:\n/)[0];
    const text = section
      .match(/\n    if: (.*?)\n    runs-on:/s)[1]
      .replace(/^>-\s*/, "");
    const expression = text.replace(
      /\bneeds\.([a-z-]+)\.result\b/g,
      (_, job) => `needs[${JSON.stringify(job)}].result`
    );
    return new Function(
      "vars",
      "github",
      "needs",
      "always",
      "cancelled",
      `return (${expression});`
    );
  };
  assert(!workflow.includes("  deploy-oracle-production:\n"));
  const render = condition("deploy-render-production"),
    publish = condition("deploy-vercel-production");
  const context = (host, changes = {}) => {
    const github = {
      ref: "refs/heads/main",
      event_name: "push",
      ...changes.github,
    };
    const needs = {
      "build-and-test": { result: "success" },
      "deploy-render-production": {
        result: host === "render" || host === "" ? "success" : "skipped",
      },
      ...changes.needs,
    };
    return [
      { DU_BACKEND_HOST: host },
      github,
      needs,
      () => true,
      () => Boolean(changes.cancelled),
    ];
  };
  for (const host of ["", "render"]) {
    assert.equal(render(...context(host)), true);
    assert.equal(publish(...context(host)), true);
    for (const result of ["failure", "cancelled", "skipped"])
      assert.equal(
        publish(...context(host, { needs: { "build-and-test": { result } } })),
        false
      );
    for (const result of ["failure", "cancelled", "skipped"])
      assert.equal(
        publish(...context(host, { needs: { "deploy-render-production": { result } } })),
        false
      );
    assert.equal(
      publish(...context(host, { github: { ref: "refs/heads/develop" } })),
      false
    );
    assert.equal(
      publish(...context(host, { github: { event_name: "pull_request" } })),
      false
    );
    assert.equal(publish(...context(host, { cancelled: true })), false);
  }
  for (const host of ["oracle", "invalid"]) {
    assert.equal(render(...context(host)), false);
    assert.equal(publish(...context(host)), false);
  }
});
