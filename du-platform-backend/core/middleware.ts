import cors from "cors";
import express from "express";
import type { Express } from "express";
import crypto from "crypto";
import { logger } from "./logger";
import { loadConfig } from "./config";

function resolveTrustProxySetting(): boolean | number | string {
  const raw = String(process.env.TRUST_PROXY ?? "").trim();
  if (!raw) return false;
  if (raw === "true") return true;
  if (raw === "false") return false;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.floor(asNumber);
  }

  return raw;
}

function normalizeOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function buildAllowedOriginSet(configuredOrigins: string[]): Set<string> {
  const allowed = new Set<string>();
  for (const origin of configuredOrigins) {
    const normalized = normalizeOrigin(origin);
    if (normalized) allowed.add(normalized);
  }
  return allowed;
}

function isAllowedRequestOrigin(
  req: express.Request,
  configuredOrigins: string[]
) {
  // Only check against explicitly configured origins — never trust Host or X-Forwarded-Proto
  // headers here, as those can be spoofed by a malicious request.
  const allowedOrigins = buildAllowedOriginSet(configuredOrigins);
  const originHeader = String(req.headers.origin ?? "").trim();
  const refererHeader = String(req.headers.referer ?? "").trim();

  if (originHeader) {
    const normalizedOrigin = normalizeOrigin(originHeader);
    return normalizedOrigin !== null && allowedOrigins.has(normalizedOrigin);
  }

  if (refererHeader) {
    const normalizedRefererOrigin = normalizeOrigin(refererHeader);
    return (
      normalizedRefererOrigin !== null &&
      allowedOrigins.has(normalizedRefererOrigin)
    );
  }

  // Neither Origin nor Referer present on a session-cookie POST — reject to prevent CSRF
  // from clients that strip request headers. Bearer-token requests bypass this check earlier.
  return false;
}

export function registerCoreMiddleware(app: Express) {
  const config = loadConfig();
  const isProduction =
    (process.env.NODE_ENV ?? "development").toLowerCase() === "production";

  // connect-src enumerates specific external origins the browser is allowed to
  // fetch from.  Using the wildcard `https:` is too broad — a compromised
  // dependency could exfiltrate data to any HTTPS endpoint.
  // Add domains here as new first-party browser fetch targets are introduced.
  const connectSrcOrigins: string[] = [
    "'self'",
    // Embedded textures in locally served GLB controller models.
    "blob:",
    // Vercel Speed Insights / Analytics (loaded only when VITE_ENABLE_VERCEL_ANALYTICS=true)
    "https://vitals.vercel-insights.com",
    "https://va.vercel-scripts.com",
  ];
  if (!isProduction) {
    // Allow HMR WebSocket in development
    connectSrcOrigins.push("ws:", "wss:");
  }
  const connectSrc = connectSrcOrigins;

  // Preview/browser test deployments may never write to the production API,
  // even through anonymous routes that do not use session cookies.
  app.use((req, res, next) => {
    const origin = String(req.headers.origin || "");
    if (
      isProduction &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (process.env.DU_DEPLOYMENT_ENV === "preview" ||
        /^https:\/\/[^/]+\.vercel\.app$/i.test(origin) ||
        req.headers["x-du-test-environment"])
    ) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "PREVIEW_WRITE_BLOCKED",
          message:
            "Production writes are disabled from previews and test clients.",
        },
      });
    }
    next();
  });
  app.disable("x-powered-by");
  app.set("trust proxy", resolveTrustProxySetting());

  app.use((req, _res, next) => {
    (req as any).requestId = crypto.randomUUID();
    next();
  });

  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on("finish", () => {
      logger.info("request_completed", {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        status: _res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "X-Idempotency-Key",
        "X-Order-Access-Token",
      ],
    })
  );

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf, encoding) => {
        (req as any).rawBody =
          buf.length > 0
            ? buf.toString((encoding as BufferEncoding) || "utf8")
            : "";
      },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(self), microphone=(self), camera=(self)"
    );
    res.setHeader(
      "Report-To",
      JSON.stringify({
        group: "csp-endpoint",
        max_age: 86400,
        endpoints: [{ url: "/api/csp-report" }],
      })
    );
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: data:",
        "font-src 'self' data:",
        `connect-src ${connectSrc.join(" ")}`,
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "report-uri /api/csp-report",
        "report-to csp-endpoint",
      ].join("; ")
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    next();
  });

  app.use((req, res, next) => {
    if (
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
    )
      return next();
    const hasBearerToken =
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ");
    if (hasBearerToken) return next();

    const cookieHeader = String(req.headers.cookie ?? "");
    const hasSessionCookie = /(?:^|;\s*)du_session=/.test(cookieHeader);
    if (!hasSessionCookie) return next();

    if (!isAllowedRequestOrigin(req, config.corsOrigins)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "CSRF_ORIGIN_BLOCKED",
          message: "Cross-site session request blocked.",
        },
      });
    }

    // Default CSRF token enforcement to enabled in production; set CSRF_ENABLED=false to disable.
    const csrfEnabled =
      process.env.CSRF_ENABLED !== undefined
        ? process.env.CSRF_ENABLED.toLowerCase() === "true"
        : isProduction;
    if (!csrfEnabled) return next();

    const token = String(req.headers["x-csrf-token"] ?? "").trim();
    if (!token)
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: "CSRF_REQUIRED", message: "Missing CSRF token." },
      });
    return next();
  });
}
