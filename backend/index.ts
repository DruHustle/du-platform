import axios from "axios";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  createNtirEntity,
  createFeatureNotification,
  createSuccessStory,
  updateSuccessStory,
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  createUser,
  db,
  deleteSession,
  findUserByEmail,
  findUserById,
  getFeatureNotifications,
  getNtirEntities,
  getSession,
  getSuccessStories,
  initializeDatabase,
  searchNtirEntities,
  updateNtirEntity,
  updateUserPassword,
  setUserKycVerified,
  listShopProducts,
  createShopOrder,
  getShopOrderByRef,
  confirmShopOrderPayment,
  getShopProductsAdmin,
  getShopProductById,
  createShopProductAdmin,
  updateShopProductAdmin,
  deleteShopProductAdmin,
  createShopRestockNotification,
  getShopRestockNotifications,
  getShopRestockNotificationsBySlug,
  getAdminSetting,
  upsertAdminSetting,
} from "./db";
import { registerApiRoutes } from "./api";
import { createRateLimiter } from "./middleware/rateLimiter";
import { registerFinancialRoutes } from "./routes/financialRoutes";
import { registerDomainModules } from "./modules";
import { errorResponse, successResponse } from "./utils/apiResponse";
import { isUserEmailConflictError } from "./utils/dbErrors";
import { createJwtToken } from "./utils/jwt";

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[process] Uncaught exception:", error);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_COOKIE = "zigd_session";
const DEFAULT_ONESA_SYSTEM_PROMPT = [
  "You are Onesa AI, a Zimbabwe-focused diaspora decision-support assistant.",
  "Be warm, clear, and conversational.",
  "Do not claim to be trained by Google, OpenAI, or any other big-tech company.",
  "If asked who you are or who trained/built you, identify as Onesa and describe the local-community mission.",
  "If the user sends a simple greeting (for example: hello, hi, hey, mhoro, hesi, ndeipi), respond briefly in 1-2 short sentences and ask one simple follow-up question.",
  "Do not auto-translate or explain language unless the user explicitly asks for translation.",
  "Do not dump long bullet lists unless the user asks for detailed guidance.",
  "For normal requests, provide practical and concise guidance for tourism, trade, and investment, and clearly mark uncertainty.",
].join(" ");
const ONESA_IDENTITY_REPLIES: Record<SupportedOnesaLanguage, string> = {
  en:
    "Onesa was built by developers at Onesa AI. Onesa means illuminate and that’s exactly what we’re here to do. We’re building AI that brings relevant, up-to-date local information to communities that are too often overlooked or under-served. The goal is simple: help people make more accurate, informed decisions in their own context.\n\nBig AI companies build powerful tools, but they usually miss the local nuance. What matters in one city, neighborhood, or community can be totally different in another. We’re focused on closing that gap by working with local data, local realities, and real community needs.",
  sn:
    "Onesa yakavakwa nevagadziri vari paOnesa AI. Onesa zvinoreva kuvhenekera, uye ndizvo chaizvo zvatiri pano kuita. Tiri kuvaka AI inounza ruzivo rwemuno rwakakodzera uye rwemazuva ano kunharaunda dzinowanzoregeredzwa kana kusashandirwa zvakakwana. Chinangwa chiri nyore: kubatsira vanhu kuita sarudzo dzakarurama uye dzine ruzivo mumamiriro avo chaiwo.\n\nMakambani makuru eAI anovaka maturusi ane simba, asi kazhinji anopotsa nuance yemuno. Chinokosha muguta rimwe, munharaunda imwe, kana munzvimbo imwe chinogona kusiyana zvikuru mune imwe. Isu takatarisa kuvhara gaka iri nekushanda nedata remuno, chokwadi chemuno, uye zvinodiwa chaizvo nenharaunda.",
  nd:
    "Onesa yakhiwe ngabaqambi abaseOnesa AI. Onesa kutsho ukukhanyisa, njalo yikho kanye esilapha ukukwenza. Sakha i-AI eletha ulwazi lwendawo olufaneleyo, olusesikhathini, emiphakathini evame ukunganakwa loba engasizakali kahle. Injongo ilula: ukusiza abantu benze izinqumo ezinembile, ezinolwazi, endaweni yabo.\n\nAmankampani amakhulu e-AI akha amathuluzi alomfutho, kodwa kuvamile ukuthi aphuthe umehluko wendawo. Okubalulekileyo kwelinye idolobho, umakhelwane, loba umphakathi kungahluka kakhulu kwenye indawo. Thina sigxile ukuvala lowo mgodi ngokusebenza ngedatha yendawo, izimo zendawo, kanye lezidingo zangempela zomphakathi.",
  de:
    "Onesa wurde von Entwicklerinnen und Entwicklern bei Onesa AI aufgebaut. Onesa bedeutet erleuchten, und genau das ist unser Auftrag. Wir entwickeln KI, die relevante und aktuelle lokale Informationen in Gemeinschaften bringt, die zu oft übersehen oder unterversorgt sind. Das Ziel ist einfach: Menschen dabei zu helfen, in ihrem eigenen Kontext präzisere und fundiertere Entscheidungen zu treffen.\n\nGroße KI-Unternehmen bauen leistungsstarke Werkzeuge, aber ihnen entgeht oft die lokale Nuance. Was in einer Stadt, Nachbarschaft oder Gemeinschaft wichtig ist, kann in einer anderen völlig anders sein. Wir schließen diese Lücke, indem wir mit lokalen Daten, lokalen Realitäten und echten Bedürfnissen der Gemeinschaft arbeiten.",
};

function getOnesaIdentityReply(language: SupportedOnesaLanguage): string {
  return ONESA_IDENTITY_REPLIES[language] ?? ONESA_IDENTITY_REPLIES.en;
}
const ONESA_READINESS_CACHE_MS = 120000;
const ONESA_READINESS_GRACE_MS = 120000;
const SERVER_STARTED_AT = Date.now();

type OnesaReadiness = {
  ok: boolean;
  ready: boolean;
  provider: string;
  model: string;
  endpoint: string;
  resolvedModel?: string | null;
  message?: string;
  providerTargets?: Array<{ name: string; baseUrl: string }>;
};

let onesaReadinessCache: { checkedAt: number; value: OnesaReadiness } | null = null;
let lastOnesaSuccessAt = 0;
const onesaProviderBackoffUntilByEndpoint = new Map<string, number>();

function getAllowedCorsOrigins(): string[] {
  const fromEnv = String(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    "https://diasporaunlocked.com",
    "https://www.diasporaunlocked.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  return Array.from(new Set([...defaults, ...fromEnv]));
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const checkHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(checkHash, "hex"));
}

function getCookie(req: express.Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const entries = raw.split(";").map((x) => x.trim());
  for (const entry of entries) {
    const [k, ...v] = entry.split("=");
    if (k === key) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setSessionCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`
  );
}

function clearSessionCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
}

async function resolveAuthToken(req: express.Request): Promise<string | null> {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.replace("Bearer ", "");
  return getCookie(req, SESSION_COOKIE);
}

async function resolveAuthUser(req: express.Request) {
  const token = await resolveAuthToken(req);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  const user = await findUserById(Number(session.user_id));
  if (!user) return null;
  return user;
}

function issueAccessTokenForUser(user: { id: number; email?: string | null; full_name?: string | null }) {
  const ttl = Math.max(60, Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "3600"));
  return createJwtToken(
    {
      sub: Number(user.id),
      email: user.email ? String(user.email) : undefined,
      name: user.full_name ? String(user.full_name) : undefined,
      scope: "user",
    },
    {
      expiresInSeconds: ttl,
      issuer: "zigd-platform",
      audience: "zigd-web",
    }
  );
}

function isAdminEmail(email: string): boolean {
  const configured = String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length === 0) return false;
  return configured.includes(email.trim().toLowerCase());
}

function getAdminEmails(): string[] {
  return String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_SETTING_NOTIFY_ALERT_EMAILS = "notify_alert_emails";
const ADMIN_SETTING_NOTIFY_FROM_EMAIL = "notify_from_email";

function isValidEmail(email: string): boolean {
  const value = String(email ?? "").trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendEmailMessage(payload: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  const provider = process.env.RESET_EMAIL_PROVIDER?.toLowerCase() ?? "resend";
  const from = String(payload.from ?? process.env.FROM_EMAIL ?? "no-reply@zigd-platform.com").trim();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(
        `[email:dry-run] to=${recipients.join(",")} subject=${payload.subject}`
      );
      return;
    }
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  console.log(`[email:unsupported-provider:${provider}] to=${recipients.join(",")}`);
}

async function sendEmailMessageSafe(
  payload: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  },
  context: string
) {
  try {
    await sendEmailMessage(payload);
    return true;
  } catch (error: any) {
    console.error(`[email] failed in ${context}`, {
      message: String(error?.message ?? error),
      subject: payload.subject,
    });
    return false;
  }
}

function parseCsvEmails(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => isValidEmail(item));
}

async function getNotifyFromEmail(): Promise<string> {
  const configured = await getAdminSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL);
  if (configured && isValidEmail(configured)) return configured;
  return String(process.env.FROM_EMAIL ?? "no-reply@zigd-platform.com").trim();
}

async function getNotifyAlertEmails(): Promise<string[]> {
  const configured = await getAdminSetting(ADMIN_SETTING_NOTIFY_ALERT_EMAILS);
  const configuredEmails = parseCsvEmails(configured);
  if (configuredEmails.length > 0) return configuredEmails;
  return getAdminEmails();
}

async function sendResetEmail(to: string, resetUrl: string) {
  const provider = process.env.RESET_EMAIL_PROVIDER?.toLowerCase() ?? "resend";
  const from = process.env.FROM_EMAIL ?? "no-reply@zigd-platform.com";

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[reset-email:dry-run] ${to} -> ${resetUrl}`);
      return;
    }

    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [to],
        subject: "Reset your Diaspora Unlocked password",
        html: `<p>We received a request to reset your password.</p><p><a href=\"${resetUrl}\">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  console.log(`[reset-email:unsupported-provider:${provider}] ${to} -> ${resetUrl}`);
}

async function notifyRestockSubscribersAndAdmins(input: {
  productId: number;
  productName: string;
  productSlug: string;
  stockQty: number;
  updatedByEmail: string;
}) {
  if ((process.env.NODE_ENV ?? "development") !== "production") return;

  const productSlug = String(input.productSlug ?? "").trim().toLowerCase();
  if (!productSlug) return;

  try {
    const fromEmail = await getNotifyFromEmail();
    const rows = await getShopRestockNotificationsBySlug(productSlug);
    const uniqueEmails = Array.from(
      new Set(
        rows
          .map((row: any) => String(row?.email ?? "").trim().toLowerCase())
          .filter((email) => isValidEmail(email))
      )
    );

    if (uniqueEmails.length > 0) {
      const subject = `${input.productName} is back in stock`;
      const html = `<p>Hello,</p>
<p><strong>${input.productName}</strong> is now back in stock on the Zimbabwe Shop.</p>
<p>You can return to the shop and place your order.</p>
<p>Thank you.</p>`;

      const text = `${input.productName} is now back in stock on the Zimbabwe Shop. You can return to the shop and place your order.`;
      await sendEmailMessage({ to: uniqueEmails, subject, html, text, from: fromEmail });
    }

    const adminEmails = await getNotifyAlertEmails();
    if (adminEmails.length > 0) {
      const subject = `Restock alert: ${input.productName}`;
      const html = `<p><strong>Restock detected.</strong></p>
<p>Product: ${input.productName}</p>
<p>Slug: ${productSlug}</p>
<p>Current stock: ${input.stockQty}</p>
<p>Subscribers notified automatically: ${uniqueEmails.length}</p>
<p>Action: please review Admin > Notify Me and send any additional manual communication if needed.</p>
<p>Updated by: ${input.updatedByEmail}</p>`;
      const text = `Restock detected for ${input.productName} (${productSlug}). Current stock: ${input.stockQty}. Subscribers notified automatically: ${uniqueEmails.length}. Action: review Admin > Notify Me and send any additional manual communication if needed. Updated by: ${input.updatedByEmail}`;
      await sendEmailMessage({ to: adminEmails, subject, html, text, from: fromEmail });
    }
  } catch (error: any) {
    console.error("[shop/restock-notify] failed", {
      productSlug,
      message: String(error?.message ?? error),
    });
  }
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type TripPlanPayload = {
  origin: string;
  season: "dry" | "green" | "shoulder";
  budget: "low" | "medium" | "high";
  comfort: "budget" | "standard" | "premium";
  days: number;
  travelers: number;
  interests: string[];
};

type TripPlanResult = {
  summary: string;
  optimizedFor: string;
  estimatedTotalUsd: number;
  flights: {
    route: string;
    cabin: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  hotels: {
    area: string;
    style: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  carHire: {
    vehicleClass: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  experiences: Array<{
    name: string;
    location: string;
    estimatedCostUsd: number;
    rationale: string;
  }>;
  itinerary: Array<{
    day: number;
    title: string;
    details: string;
    estimatedDailyCostUsd: number;
  }>;
};

type OnesaReplyResult = {
  reply: string;
  truncated: boolean;
  finishReason?: string;
};

type SupportedOnesaLanguage = "en" | "sn" | "nd" | "de";

function normalizeOnesaLanguage(value: unknown): SupportedOnesaLanguage {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "sn" || base === "nd" || base === "de" || base === "en") return base;
  if (raw === "shona") return "sn";
  if (raw === "ndebele") return "nd";
  if (raw === "german" || raw === "deutsch") return "de";
  return "en";
}

function getOnesaLanguageLabel(language: SupportedOnesaLanguage): string {
  if (language === "sn") return "Shona";
  if (language === "nd") return "Ndebele";
  if (language === "de") return "German";
  return "English";
}

function getOnesaLanguageFallbackReply(language: SupportedOnesaLanguage): string {
  if (language === "sn") {
    return "Pane dambudziko diki pakugadzira mhinduro izvozvi. Ndapota edza zvakare munguva pfupi.";
  }
  if (language === "nd") {
    return "Kukhona inkinga encane ekuphenduleni okwamanje. Sicela uzame njalo ngemva kwesikhatshana.";
  }
  if (language === "de") {
    return "Ich habe gerade ein kleines Problem beim Antworten. Bitte versuchen Sie es in Kürze erneut.";
  }
  return "I am having trouble generating a reliable response right now. Please try again.";
}

function normalizeTripPlanPayload(raw: any): TripPlanPayload {
  const toText = (value: unknown, fallback: string) => {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text.slice(0, 120) : fallback;
  };
  const toEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T => {
    const text = String(value ?? "").trim().toLowerCase() as T;
    return allowed.includes(text) ? text : fallback;
  };
  const toInt = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  };

  const interestsRaw = Array.isArray(raw?.interests) ? raw.interests : [];
  const interestWhitelist = new Set(["wildlife", "culture", "adventure", "food", "history", "nature"]);
  const interests = interestsRaw
    .map((value: unknown) => String(value ?? "").trim().toLowerCase())
    .filter((value: string) => interestWhitelist.has(value))
    .slice(0, 6);

  return {
    origin: toText(raw?.origin, "Berlin"),
    season: toEnum(raw?.season, ["dry", "green", "shoulder"], "dry"),
    budget: toEnum(raw?.budget, ["low", "medium", "high"], "medium"),
    comfort: toEnum(raw?.comfort, ["budget", "standard", "premium"], "standard"),
    days: toInt(raw?.days, 3, 14, 7),
    travelers: toInt(raw?.travelers, 1, 8, 2),
    interests: interests.length > 0 ? interests : ["wildlife", "culture"],
  };
}

function tryParseJsonObject(input: string): Record<string, any> | null {
  const text = String(input ?? "").trim();
  if (!text) return null;
  const direct = (() => {
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  })();
  if (direct) return direct;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
  } catch {
    return null;
  }
}

function buildFallbackTripPlan(payload: TripPlanPayload): TripPlanResult {
  const seasonMultiplier = payload.season === "dry" ? 1.2 : payload.season === "green" ? 0.9 : 1.0;
  const flightBaseByBudget: Record<TripPlanPayload["budget"], number> = {
    low: 620,
    medium: 910,
    high: 1380,
  };
  const hotelNightByComfort: Record<TripPlanPayload["comfort"], number> = {
    budget: 85,
    standard: 150,
    premium: 260,
  };
  const carDayByComfort: Record<TripPlanPayload["comfort"], number> = {
    budget: 42,
    standard: 65,
    premium: 110,
  };

  const experiencesCatalog = [
    { tag: "wildlife", name: "Hwange Guided Safari", location: "Hwange", cost: 120 },
    { tag: "culture", name: "Mbare Cultural Food Walk", location: "Harare", cost: 45 },
    { tag: "adventure", name: "Zambezi Whitewater Rafting", location: "Victoria Falls", cost: 145 },
    { tag: "history", name: "Great Zimbabwe Guided Tour", location: "Masvingo", cost: 60 },
    { tag: "nature", name: "Eastern Highlands Hike", location: "Nyanga", cost: 55 },
    { tag: "food", name: "Harare Local Dining Circuit", location: "Harare", cost: 50 },
  ];

  const selectedExperiences = experiencesCatalog
    .filter((item) => payload.interests.includes(item.tag))
    .slice(0, Math.min(4, payload.days));
  const fallbackExperiences = selectedExperiences.length > 0 ? selectedExperiences : experiencesCatalog.slice(0, 3);

  const flightsCost = Math.round(flightBaseByBudget[payload.budget] * seasonMultiplier * payload.travelers);
  const hotelsCost = Math.round(hotelNightByComfort[payload.comfort] * payload.days * payload.travelers);
  const carCost = Math.round(carDayByComfort[payload.comfort] * payload.days);
  const experiencesCost = fallbackExperiences.reduce((sum, item) => sum + item.cost * payload.travelers, 0);
  const buffer = Math.round((flightsCost + hotelsCost + carCost + experiencesCost) * 0.12);
  const total = flightsCost + hotelsCost + carCost + experiencesCost + buffer;

  const itinerary = Array.from({ length: payload.days }, (_unused, idx) => {
    const day = idx + 1;
    const exp = fallbackExperiences[idx % fallbackExperiences.length];
    const transferCost = day === 1 || day === payload.days ? 60 : 35;
    const dayCost = Math.round(exp.cost * payload.travelers + hotelNightByComfort[payload.comfort] * payload.travelers + transferCost);
    return {
      day,
      title: day === 1 ? "Arrival and Check-in" : day === payload.days ? "Departure Day" : `${exp.name}`,
      details:
        day === 1
          ? `Arrive from ${payload.origin}, transfer to hotel, and settle in with a light orientation walk.`
          : day === payload.days
            ? "Final breakfast, optional short activity, and airport transfer."
            : `Focus on ${exp.name} in ${exp.location}, with timing optimized for ${payload.season} season conditions.`,
      estimatedDailyCostUsd: dayCost,
    };
  });

  return {
    summary: `A ${payload.days}-day Zimbabwe itinerary tuned for ${payload.season} season with ${payload.comfort} comfort and ${payload.budget} budget priorities.`,
    optimizedFor: "Balanced between seasonal value, comfort level, and total trip cost.",
    estimatedTotalUsd: total,
    flights: {
      route: `${payload.origin} → Harare / Victoria Falls`,
      cabin: payload.comfort === "premium" ? "Business + flexible fares" : payload.comfort === "standard" ? "Economy Flex" : "Economy Saver",
      estimatedCostUsd: flightsCost,
      rationale: "Flight estimate includes seasonal fare multiplier and passenger count.",
    },
    hotels: {
      area: payload.interests.includes("wildlife") ? "Victoria Falls + Hwange corridor" : "Harare + destination hubs",
      style: payload.comfort === "premium" ? "4-5 star mix" : payload.comfort === "standard" ? "3-4 star mix" : "2-3 star value lodges",
      estimatedCostUsd: hotelsCost,
      rationale: "Hotel budget calculated per night, per traveler, aligned to comfort profile.",
    },
    carHire: {
      vehicleClass: payload.comfort === "premium" ? "Premium SUV" : payload.comfort === "standard" ? "Standard SUV" : "Compact crossover",
      estimatedCostUsd: carCost,
      rationale: "Daily rental estimate includes route flexibility for major tourism corridors.",
    },
    experiences: fallbackExperiences.map((item) => ({
      name: item.name,
      location: item.location,
      estimatedCostUsd: Math.round(item.cost * payload.travelers),
      rationale: "Selected from your interest profile and seasonal suitability.",
    })),
    itinerary,
  };
}

function coerceTripPlanFromAiPayload(raw: Record<string, any>, fallback: TripPlanResult): TripPlanResult | null {
  const summary = typeof raw?.summary === "string" ? raw.summary.trim() : "";
  const optimizedFor = typeof raw?.optimizedFor === "string" ? raw.optimizedFor.trim() : "";
  const estimatedTotalUsd = Number(raw?.estimatedTotalUsd);
  const flights = raw?.flights;
  const hotels = raw?.hotels;
  const carHire = raw?.carHire;
  const experiences = Array.isArray(raw?.experiences) ? raw.experiences : [];
  const itinerary = Array.isArray(raw?.itinerary) ? raw.itinerary : [];

  if (!summary || !optimizedFor || !Number.isFinite(estimatedTotalUsd)) return null;
  if (!flights || !hotels || !carHire || experiences.length === 0 || itinerary.length === 0) return null;

  return {
    summary,
    optimizedFor,
    estimatedTotalUsd: Math.max(0, Math.round(estimatedTotalUsd)),
    flights: {
      route: typeof flights.route === "string" ? flights.route : fallback.flights.route,
      cabin: typeof flights.cabin === "string" ? flights.cabin : fallback.flights.cabin,
      estimatedCostUsd: Math.max(0, Math.round(Number(flights.estimatedCostUsd) || fallback.flights.estimatedCostUsd)),
      rationale: typeof flights.rationale === "string" ? flights.rationale : fallback.flights.rationale,
    },
    hotels: {
      area: typeof hotels.area === "string" ? hotels.area : fallback.hotels.area,
      style: typeof hotels.style === "string" ? hotels.style : fallback.hotels.style,
      estimatedCostUsd: Math.max(0, Math.round(Number(hotels.estimatedCostUsd) || fallback.hotels.estimatedCostUsd)),
      rationale: typeof hotels.rationale === "string" ? hotels.rationale : fallback.hotels.rationale,
    },
    carHire: {
      vehicleClass: typeof carHire.vehicleClass === "string" ? carHire.vehicleClass : fallback.carHire.vehicleClass,
      estimatedCostUsd: Math.max(0, Math.round(Number(carHire.estimatedCostUsd) || fallback.carHire.estimatedCostUsd)),
      rationale: typeof carHire.rationale === "string" ? carHire.rationale : fallback.carHire.rationale,
    },
    experiences: experiences.slice(0, 6).map((item: any, idx: number) => ({
      name: typeof item?.name === "string" ? item.name : fallback.experiences[idx % fallback.experiences.length].name,
      location:
        typeof item?.location === "string"
          ? item.location
          : fallback.experiences[idx % fallback.experiences.length].location,
      estimatedCostUsd: Math.max(
        0,
        Math.round(Number(item?.estimatedCostUsd) || fallback.experiences[idx % fallback.experiences.length].estimatedCostUsd)
      ),
      rationale:
        typeof item?.rationale === "string"
          ? item.rationale
          : fallback.experiences[idx % fallback.experiences.length].rationale,
    })),
    itinerary: itinerary.slice(0, 14).map((item: any, idx: number) => ({
      day: Math.max(1, Math.round(Number(item?.day) || idx + 1)),
      title: typeof item?.title === "string" ? item.title : fallback.itinerary[idx % fallback.itinerary.length].title,
      details:
        typeof item?.details === "string"
          ? item.details
          : fallback.itinerary[idx % fallback.itinerary.length].details,
      estimatedDailyCostUsd: Math.max(
        0,
        Math.round(Number(item?.estimatedDailyCostUsd) || fallback.itinerary[idx % fallback.itinerary.length].estimatedDailyCostUsd)
      ),
    })),
  };
}

function getUpstreamStatus(error: any): number {
  return Number(error?.response?.status ?? 0);
}

function getEndpointBackoffRemainingMs(endpointKey: string): number {
  const now = Date.now();
  const until = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
  return Math.max(0, until - now);
}

function getGlobalBackoffRemainingMs(): number {
  const now = Date.now();
  let maxRemaining = 0;
  onesaProviderBackoffUntilByEndpoint.forEach((until) => {
    maxRemaining = Math.max(maxRemaining, Math.max(0, until - now));
  });
  return maxRemaining;
}

function parseRetryAfterMs(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value).trim();
  if (!text) return null;

  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(0, Math.floor(seconds * 1000));
  }

  const dateMs = Date.parse(text);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function getRetryAfterMs(error: any): number | null {
  const headers = error?.response?.headers ?? {};
  const retryAfter =
    parseRetryAfterMs(headers["retry-after"]) ??
    parseRetryAfterMs(headers["x-ratelimit-reset-after"]) ??
    parseRetryAfterMs(headers["x-rate-limit-reset"]);
  return retryAfter;
}

function isRateLimitedUpstreamError(error: any): boolean {
  const status = getUpstreamStatus(error);
  if (status === 429) return true;
  const message = String(error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests") || message.includes("status code 429");
}

function isRetryableUpstreamError(error: any): boolean {
  if (isRateLimitedUpstreamError(error)) return true;
  const status = getUpstreamStatus(error);
  return status === 503 || status === 504 || status === 529;
}

async function withRetry<T>(run: () => Promise<T>, maxAttempts = 3, endpointKey?: string): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error: any) {
      lastError = error;
      if (isRateLimitedUpstreamError(error)) {
        const retryAfterMs = getRetryAfterMs(error);
        const jitterMs = Math.floor(Math.random() * 250);
        const fallbackBackoffMs = 10000 + jitterMs;
        const delayMs = Math.max(fallbackBackoffMs, retryAfterMs ?? 0);
        if (endpointKey) {
          const existing = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
          onesaProviderBackoffUntilByEndpoint.set(endpointKey, Math.max(existing, Date.now() + delayMs));
        }
        // Immediately fail over to the next provider endpoint for 429s.
        throw error;
      }
      if (!isRetryableUpstreamError(error) || attempt === maxAttempts) {
        throw error;
      }
      const retryAfterMs = getRetryAfterMs(error);
      const jitterMs = Math.floor(Math.random() * 250);
      const backoffMs = Math.min(15000, 700 * (2 ** (attempt - 1))) + jitterMs;
      const delayMs = Math.max(backoffMs, retryAfterMs ?? 0);
      if (isRateLimitedUpstreamError(error) && endpointKey) {
        const existing = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
        onesaProviderBackoffUntilByEndpoint.set(endpointKey, Math.max(existing, Date.now() + delayMs));
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function getLatestUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user" && typeof msg.content === "string") {
      const text = msg.content.trim();
      if (text) return text;
    }
  }
  return "";
}

function normalizeSmallTalkPhrase(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  if (!normalized) return "";
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length > 4) return "";
  return tokens.join(" ");
}

function detectLatestUserLanguage(content: string): SupportedOnesaLanguage | null {
  const greetingLanguage = detectGreetingLanguage(content);
  if (greetingLanguage) return greetingLanguage;

  const normalized = content.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const score = { en: 0, sn: 0, nd: 0, de: 0 } as Record<SupportedOnesaLanguage, number>;
  const has = (set: Set<string>, word: string) => set.has(word);
  const snWords = new Set([
    "mhoro",
    "ndeip",
    "ndeipi",
    "makadii",
    "maswera",
    "sei",
    "ndatenda",
    "mazvita",
    "nding",
    "kubatsira",
    "urisei",
  ]);
  const ndWords = new Set(["sawubona", "salibonani", "kunjani", "ngiyabonga", "nxa", "lamuhla", "ngingakuncedisa"]);
  const deWords = new Set(["hallo", "guten", "danke", "bitte", "ich", "und", "wie", "kann"]);
  const enWords = new Set(["hello", "hi", "hey", "thanks", "thank", "you", "how", "can", "help", "today"]);

  for (const word of words) {
    if (has(snWords, word) || word.startsWith("ndi")) score.sn += 1;
    if (has(ndWords, word) || word.startsWith("ngi")) score.nd += 1;
    if (has(deWords, word)) score.de += 1;
    if (has(enWords, word)) score.en += 1;
  }

  const ranked = (Object.keys(score) as SupportedOnesaLanguage[]).sort((a, b) => score[b] - score[a]);
  const top = ranked[0];
  if (score[top] <= 0) return null;
  const second = ranked[1];
  if (score[top] === score[second]) return null;
  return top;
}

function isMixedLanguageReply(reply: string, expectedLanguage: SupportedOnesaLanguage): boolean {
  const normalized = reply.toLowerCase();
  if (expectedLanguage === "en") return false;

  const englishMarkers = [
    "how can i",
    "i can",
    "you can",
    "please",
    "today",
    "investment",
    "trade",
    "tourism",
  ];
  const swahiliMarkers = ["kwa kutumia", "kama ", " au ", "mifumo yote", "naweza", "leo"];
  const englishHits = englishMarkers.reduce((count, marker) => (normalized.includes(marker) ? count + 1 : count), 0);

  if (expectedLanguage === "sn") {
    const swahiliHits = swahiliMarkers.reduce((count, marker) => (normalized.includes(marker) ? count + 1 : count), 0);
    return englishHits >= 2 || swahiliHits >= 1;
  }

  if (expectedLanguage === "nd" || expectedLanguage === "de") {
    return englishHits >= 2;
  }

  return false;
}

function detectGreetingLanguage(content: string): SupportedOnesaLanguage | null {
  const phrase = normalizeSmallTalkPhrase(content);
  if (!phrase) return null;

  if (phrase.includes("urisei") || phrase.includes("uri sei")) return "sn";

  const greetingsByLanguage: Record<SupportedOnesaLanguage, Set<string>> = {
    en: new Set([
    "hi",
    "hello",
    "hey",
    "yo",
    "howdy",
    "good morning",
    "good afternoon",
    "good evening",
    ]),
    sn: new Set([
      "mhoro",
      "hesi",
      "ndeipi",
      "ndeip",
      "ndepi",
      "makadii",
      "maswera sei",
      "uri sei",
      "urisei",
    ]),
    nd: new Set([
      "salibonani",
      "sawubona",
      "kunjani",
    ]),
    de: new Set([
      "hallo",
      "guten tag",
      "guten morgen",
      "guten abend",
      "servus",
    ]),
  };

  for (const language of Object.keys(greetingsByLanguage) as SupportedOnesaLanguage[]) {
    if (greetingsByLanguage[language].has(phrase)) return language;
  }
  return null;
}

function getSmallTalkReply(
  content: string,
  defaultLanguage: SupportedOnesaLanguage
): string | null {
  const normalized = content.trim().toLowerCase();
  const identityPatterns = [
    /\bwho are you\b/,
    /\bwhat are you\b/,
    /\bwhat is onesa\b/,
    /\bwho is onesa\b/,
    /\bwhere are you from\b/,
    /\bwhere r you from\b/,
    /\bwhat is your origin\b/,
    /\bwhat's your origin\b/,
    /\bwhere do you come from\b/,
    /\bwho built you\b/,
    /\bwho created you\b/,
    /\bare you made by\b/,
    /\bwho made you\b/,
    /\bwho trained you\b/,
    /\bare you trained by\b/,
    /\bname of (the )?team\b/,
    /\bteam name\b/,
    /\bwho is your team\b/,
    /\bwho are your developers\b/,
    /\bwho developed you\b/,
    /\bwhat('?s| is) the name of (your|the) team\b/,
  ];
  if (identityPatterns.some((pattern) => pattern.test(normalized))) {
    const identityLanguage = detectLatestUserLanguage(content) ?? defaultLanguage;
    return getOnesaIdentityReply(identityLanguage);
  }
  const greetingLanguage = detectGreetingLanguage(normalized);
  if (greetingLanguage) {
    const language = greetingLanguage ?? defaultLanguage;
    if (language === "sn") return "Mhoro! Ndini Onesa. Ndingakubatsirai nei nhasi?";
    if (language === "nd") return "Sawubona! Ngingu Onesa. Ngingakuncedisa ngani lamuhla?";
    if (language === "de") return "Hallo! Ich bin Onesa. Wie kann ich dir heute helfen?";
    return "Hi! I am Onesa. How can I help you today?";
  }
  return null;
}

function hasForbiddenOriginClaim(reply: string): boolean {
  const text = String(reply ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return false;

  const llmSelfIdPatterns = [
    /\bas an ai\b/,
    /\bi am an ai model\b/,
    /\bi'm an ai model\b/,
    /\bi am a large language model\b/,
    /\bi'm a large language model\b/,
    /\bi am (an )?ai[, ]+a large language model\b/,
    /\bi'm (an )?ai[, ]+a large language model\b/,
    /\bi am an ai language model\b/,
    /\bi'm an ai language model\b/,
    /\blarge language model trained by\b/,
  ];
  if (llmSelfIdPatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const providerPattern =
    /(google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama|big tech|big-tech)/;
  const subjectPattern = /\b(i am|i'm|i was|im|onesa is|onesa was)\b/;
  const verbPattern = /\b(developed|created|trained|built|made)\b/;
  const orgPattern = providerPattern;

  if (subjectPattern.test(text) && verbPattern.test(text) && orgPattern.test(text)) {
    return true;
  }

  const directClaimPatterns = [
    /\bmade by (google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama)\b/,
    /\bdeveloped by (google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama)\b/,
    /\bcreated by (google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama)\b/,
    /\btrained by (google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama)\b/,
    /\bbuilt by (google|google gemini|gemini|openai|chatgpt|microsoft|azure|azure openai|meta|anthropic|claude|cerebras|groq|ollama)\b/,
  ];
  return directClaimPatterns.some((pattern) => pattern.test(text));
}

function enforceOnesaIdentityGuard(reply: string, language: SupportedOnesaLanguage): string {
  if (hasForbiddenOriginClaim(reply)) {
    return getOnesaIdentityReply(language);
  }
  return reply;
}

function hasLanguageMetaReply(reply: string): boolean {
  const text = String(reply ?? "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("speaking in shona") ||
    text.includes("speaking in ndebele") ||
    text.includes("speaking in german") ||
    text.includes("let me try that again in english") ||
    text.includes("let me try that again in") ||
    text.includes("in english") && text.includes("let me try")
  );
}

type CloudProviderTarget = {
  name: "primary" | "secondary" | "tertiary" | "tertiary2" | "tertiary3";
  kind: "openai" | "anthropic";
  baseUrl: string;
  apiKey: string;
  models: string[];
  anthropicVersion?: string;
};

function isPlaceholderApiKey(value: string): boolean {
  const normalized = value.trim();
  return (
    !normalized ||
    normalized === "YOUR_GEMINI_API_KEY" ||
    normalized === "YOUR_GROQ_API_KEY" ||
    normalized === "YOUR_PERPLEXITY_API_KEY" ||
    normalized.startsWith("YOUR_")
  );
}

function buildCloudProviderTargets(config: ReturnType<typeof getOnesaConfig>): CloudProviderTarget[] {
  const primaryModels = Array.from(
    new Set([...config.modelCandidates, config.model, config.fallbackModel].filter(Boolean))
  );
  const secondaryModels = Array.from(
    new Set(
      [...config.secondaryModelCandidates, config.secondaryModel, config.secondaryFallbackModel].filter(Boolean)
    )
  );
  const claudeModels = Array.from(
    new Set([...config.claudeModelCandidates, config.claudeModel, config.claudeFallbackModel].filter(Boolean))
  );
  const cerebrasModels = Array.from(
    new Set([...config.cerebrasModelCandidates, config.cerebrasModel, config.cerebrasFallbackModel].filter(Boolean))
  );
  const perplexityModels = Array.from(
    new Set([...config.perplexityModelCandidates, config.perplexityModel, config.perplexityFallbackModel].filter(Boolean))
  );

  const targets: CloudProviderTarget[] = [];
  // Primary: Gemini/OpenAI-compatible
  if (!isPlaceholderApiKey(config.openaiApiKey)) {
    targets.push({
      name: "primary",
      kind: "openai",
      baseUrl: config.openaiBase,
      apiKey: config.openaiApiKey,
      models: primaryModels.length > 0 ? primaryModels : [config.model],
    });
  }
  // Secondary: Groq (OpenAI-compatible)
  if (config.secondaryOpenaiBase && !isPlaceholderApiKey(config.secondaryOpenaiApiKey)) {
    targets.push({
      name: "secondary",
      kind: "openai",
      baseUrl: config.secondaryOpenaiBase,
      apiKey: config.secondaryOpenaiApiKey,
      models: secondaryModels.length > 0 ? secondaryModels : [config.secondaryModel || config.model],
    });
  }
  // Tertiary: Claude
  if (!isPlaceholderApiKey(config.claudeApiKey)) {
    targets.push({
      name: "tertiary",
      kind: "anthropic",
      baseUrl: config.claudeBase || "https://api.anthropic.com",
      apiKey: config.claudeApiKey,
      models: claudeModels.length > 0 ? claudeModels : [config.model],
      anthropicVersion: config.claudeAnthropicVersion,
    });
  }
  // Tertiary2: Cerebras
  if (!isPlaceholderApiKey(config.cerebrasApiKey)) {
    targets.push({
      name: "tertiary2",
      kind: "openai",
      baseUrl: config.cerebrasBase || "https://api.cerebras.ai/v1",
      apiKey: config.cerebrasApiKey,
      models: cerebrasModels.length > 0 ? cerebrasModels : [config.model],
    });
  }
  // Tertiary3: Perplexity
  if (!isPlaceholderApiKey(config.perplexityApiKey)) {
    targets.push({
      name: "tertiary3",
      kind: "openai",
      baseUrl: config.perplexityBase || "https://api.perplexity.ai",
      apiKey: config.perplexityApiKey,
      models: perplexityModels.length > 0 ? perplexityModels : [config.model],
    });
  }
  return targets;
}

function getOnesaConfig() {
  const provider = (process.env.ONESA_PROVIDER ?? process.env.ONESA_AI_PROVIDER ?? "ollama").toLowerCase();
  const geminiModel = process.env.ONESA_GEMINI_MODEL ?? "";
  const geminiFallbackModel = process.env.ONESA_GEMINI_FALLBACK_MODEL ?? "";
  const geminiModelCandidates = String(process.env.ONESA_GEMINI_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const model = geminiModel || process.env.ONESA_AI_MODEL || "llama3.1:8b";
  const fallbackModel =
    geminiFallbackModel ||
    process.env.ONESA_AI_FALLBACK_MODEL ||
    (provider === "openai_compatible" ? model : "llama3.1:8b");
  const modelCandidates = String(
    (geminiModelCandidates.length ? geminiModelCandidates.join(",") : undefined) ||
      process.env.ONESA_AI_MODEL_CANDIDATES ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const secondaryModel = process.env.ONESA_GROK_MODEL ?? "";
  const secondaryFallbackModel = process.env.ONESA_GROK_FALLBACK_MODEL ?? "";
  const secondaryModelCandidates = String(process.env.ONESA_GROK_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const tertiaryModel = process.env.ONESA_TERTIARY_MODEL ?? "";
  const tertiaryFallbackModel = process.env.ONESA_TERTIARY_FALLBACK_MODEL ?? "";
  const tertiaryModelCandidates = String(process.env.ONESA_TERTIARY_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const claudeBase = String(process.env.ONESA_CLAUDE_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const claudeApiKey = process.env.ONESA_CLAUDE_API_KEY ?? "";
  const claudeModel = process.env.ONESA_CLAUDE_MODEL ?? "";
  const claudeFallbackModel = process.env.ONESA_CLAUDE_FALLBACK_MODEL ?? "";
  const claudeModelCandidates = String(process.env.ONESA_CLAUDE_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const claudeAnthropicVersion = process.env.ONESA_CLAUDE_ANTHROPIC_VERSION ?? "2023-06-01";
  const cerebrasBase = String(process.env.ONESA_CEREBRAS_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const cerebrasApiKey = process.env.ONESA_CEREBRAS_API_KEY ?? "";
  const cerebrasModel = process.env.ONESA_CEREBRAS_MODEL ?? "";
  const cerebrasFallbackModel = process.env.ONESA_CEREBRAS_FALLBACK_MODEL ?? "";
  const cerebrasModelCandidates = String(process.env.ONESA_CEREBRAS_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const perplexityBase = String(process.env.ONESA_PERPLEXITY_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const perplexityApiKey = process.env.ONESA_PERPLEXITY_API_KEY ?? "";
  const perplexityModel = process.env.ONESA_PERPLEXITY_MODEL ?? "";
  const perplexityFallbackModel = process.env.ONESA_PERPLEXITY_FALLBACK_MODEL ?? "";
  const perplexityModelCandidates = String(process.env.ONESA_PERPLEXITY_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const ollamaBase = (process.env.ONESA_OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
  const openaiBase = (
    process.env.ONESA_GEMINI_BASE_URL ??
    process.env.ONESA_AI_BASE_URL ??
    "http://127.0.0.1:1234/v1"
  ).replace(/\/+$/, "");
  const openaiApiKey =
    process.env.ONESA_GEMINI_API_KEY ??
    process.env.ONESA_AI_API_KEY ??
    "";
  const secondaryOpenaiBase = String(process.env.ONESA_GROK_AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secondaryOpenaiApiKey = process.env.ONESA_GROK_AI_API_KEY ?? "";
  const tertiaryOpenaiBase = String(process.env.ONESA_TERTIARY_AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const tertiaryOpenaiApiKey = process.env.ONESA_TERTIARY_AI_API_KEY ?? "";
  const timeoutRaw = Number(process.env.ONESA_REQUEST_TIMEOUT_MS ?? "180000");
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 180000;
  // Default response budget tuned to reduce mid-sentence truncation.
  const maxTokensRaw = Number(process.env.ONESA_MAX_TOKENS ?? "500");
  const maxTokens = Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? Math.floor(maxTokensRaw) : 500;
  return {
    provider,
    model,
    fallbackModel,
    modelCandidates,
    secondaryModel,
    secondaryFallbackModel,
    secondaryModelCandidates,
    tertiaryModel,
    tertiaryFallbackModel,
    tertiaryModelCandidates,
    claudeBase,
    claudeApiKey,
    claudeModel,
    claudeFallbackModel,
    claudeModelCandidates,
    claudeAnthropicVersion,
    cerebrasBase,
    cerebrasApiKey,
    cerebrasModel,
    cerebrasFallbackModel,
    cerebrasModelCandidates,
    perplexityBase,
    perplexityApiKey,
    perplexityModel,
    perplexityFallbackModel,
    perplexityModelCandidates,
    ollamaBase,
    openaiBase,
    openaiApiKey,
    secondaryOpenaiBase,
    secondaryOpenaiApiKey,
    tertiaryOpenaiBase,
    tertiaryOpenaiApiKey,
    timeoutMs,
    maxTokens,
  };
}

function resolveOllamaModelName(requestedModel: string, availableModels: string[]): string | null {
  if (!requestedModel) return null;
  if (availableModels.includes(requestedModel)) return requestedModel;

  const hasTag = requestedModel.includes(":");
  if (!hasTag) {
    const latestCandidate = `${requestedModel}:latest`;
    if (availableModels.includes(latestCandidate)) return latestCandidate;
  }

  const requestedBase = requestedModel.split(":")[0];
  const sameBase = availableModels.filter((m) => m.split(":")[0] === requestedBase);
  if (sameBase.length > 0) {
    const latest = sameBase.find((m) => m.endsWith(":latest"));
    return latest ?? sameBase[0];
  }

  return null;
}

function isOllamaModelNotFoundError(error: any): boolean {
  const message = String(error?.response?.data?.error ?? error?.message ?? "").toLowerCase();
  return message.includes("model") && message.includes("not found");
}

function isLowQualityOnesaReply(reply: string): boolean {
  const text = reply.trim().toLowerCase();
  if (!text) return true;

  if (text.includes("translate from en to en")) return true;
  const notedCount = (text.match(/\bnoted\b/g) ?? []).length;
  if (notedCount >= 3) return true;

  const normalized = text.replace(/\s+/g, " ").trim();
  const segments = normalized.split(/[.!?]\s+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 4) {
    const segmentCounts = new Map<string, number>();
    for (const segment of segments) {
      segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
    }
    if (Array.from(segmentCounts.values()).some((count) => count >= 3)) {
      return true;
    }
  }

  const words = normalized.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 20) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.35) return true;
  }

  return false;
}

function buildAnthropicInput(messages: ChatMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  const chatMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
  return { system, chatMessages };
}

function extractAnthropicText(data: any): string {
  const content = data?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
    .map((block: any) => String(block.text).trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function generateOnesaReply(messages: ChatMessage[], requestedLanguage?: string): Promise<OnesaReplyResult> {
  const config = getOnesaConfig();
  const { provider, model, fallbackModel, ollamaBase, openaiBase, timeoutMs, maxTokens } = config;
  const systemPrompt = process.env.ONESA_SYSTEM_PROMPT ?? DEFAULT_ONESA_SYSTEM_PROMPT;
  const hasRequestedLanguage = typeof requestedLanguage === "string" && requestedLanguage.trim().length > 0;
  const preferredLanguage = normalizeOnesaLanguage(requestedLanguage);
  const latestUserMessage = getLatestUserMessage(messages);
  const detectedUserLanguage = latestUserMessage ? detectLatestUserLanguage(latestUserMessage) : null;
  const responseLanguage = hasRequestedLanguage ? preferredLanguage : detectedUserLanguage ?? preferredLanguage;
  const languageInstruction = hasRequestedLanguage
    ? [
        `Respond only in ${getOnesaLanguageLabel(responseLanguage)}.`,
        "Do not mix languages in the same response unless the user explicitly asks.",
        "Treat any other-language snippets in context as metadata, not reply language targets.",
        `Use ${getOnesaLanguageLabel(responseLanguage)} for the full reply.`,
        "Do not translate unless the user asks for translation.",
        "Do not mention language detection or switching languages in your response.",
      ].join(" ")
    : [
        `Respond only in ${getOnesaLanguageLabel(responseLanguage)}.`,
        "Do not mix languages in the same response unless the user explicitly asks.",
        "Always respond in the same language as the user's latest message.",
        `If the latest message language is ambiguous, use ${getOnesaLanguageLabel(responseLanguage)} only.`,
        "If the user switches language, switch with them.",
        "Do not translate unless the user asks for translation.",
        "Do not mention language detection or switching languages in your response.",
      ].join(" ");
  const safeFallbackReply = getOnesaLanguageFallbackReply(responseLanguage);
  const smallTalkReply = latestUserMessage
    ? getSmallTalkReply(latestUserMessage, responseLanguage)
    : null;
  if (smallTalkReply) {
    lastOnesaSuccessAt = Date.now();
    return { reply: smallTalkReply, truncated: false };
  }
  const normalizedMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: languageInstruction },
    ...messages.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()),
  ];

  const buildPromptFromMessages = (chatMessages: ChatMessage[]) =>
    chatMessages
      .map((m) => {
        if (m.role === "system") return `System: ${m.content}`;
        if (m.role === "assistant") return `Assistant: ${m.content}`;
        return `User: ${m.content}`;
      })
      .join("\n\n");

  const extractOllamaText = (data: any) =>
    String(data?.message?.content ?? data?.response ?? data?.content ?? "").trim();

  const sendOllamaChat = async (targetModel: string) => {
    const response = await axios.post(
      `${ollamaBase}/api/chat`,
      {
        model: targetModel,
        messages: normalizedMessages,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaText(response.data);
  };

  const sendOllamaGenerate = async (targetModel: string) => {
    const response = await axios.post(
      `${ollamaBase}/api/generate`,
      {
        model: targetModel,
        prompt: buildPromptFromMessages(normalizedMessages),
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaText(response.data);
  };

  const tryOllamaModel = async (targetModel: string): Promise<string> => {
    try {
      const chatReply = await sendOllamaChat(targetModel);
      if (chatReply) return chatReply;
    } catch {
      // Fall back to /api/generate for models that don't support chat templates.
    }
    return await sendOllamaGenerate(targetModel);
  };

  const runOllamaFallback = async (): Promise<OnesaReplyResult> => {
    let availableModels: string[] = [];
    try {
      const tagsResponse = await axios.get(`${ollamaBase}/api/tags`, { timeout: 5000 });
      availableModels = Array.isArray(tagsResponse.data?.models)
        ? tagsResponse.data.models.map((m: any) => String(m?.name ?? ""))
        : [];
    } catch {
      // Tags endpoint unavailable: continue with requested model only.
    }

    const candidates = Array.from(
      new Set([model, resolveOllamaModelName(model, availableModels)].filter((m): m is string => Boolean(m)))
    );
    const fallbackCandidates = Array.from(
      new Set([fallbackModel, resolveOllamaModelName(fallbackModel, availableModels)].filter((m): m is string => Boolean(m)))
    ).filter((candidate) => !candidates.includes(candidate));

    let lastError: any = null;
    let lowQualityReply: string | null = null;
    for (const candidate of candidates) {
      try {
        const reply = await tryOllamaModel(candidate);
        const guardedReply = enforceOnesaIdentityGuard(reply, responseLanguage);
        const finalReply = hasLanguageMetaReply(guardedReply)
          ? getOnesaLanguageFallbackReply(responseLanguage)
          : guardedReply;
        if (finalReply) {
          if (isLowQualityOnesaReply(finalReply) || isMixedLanguageReply(finalReply, responseLanguage)) {
            lowQualityReply = finalReply;
            continue;
          }
          lastOnesaSuccessAt = Date.now();
          return { reply: finalReply, truncated: false };
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    for (const candidate of fallbackCandidates) {
      try {
        const reply = await tryOllamaModel(candidate);
        const guardedReply = enforceOnesaIdentityGuard(reply, responseLanguage);
        const finalReply = hasLanguageMetaReply(guardedReply)
          ? getOnesaLanguageFallbackReply(responseLanguage)
          : guardedReply;
        if (finalReply) {
          if (isLowQualityOnesaReply(finalReply) || isMixedLanguageReply(finalReply, responseLanguage)) {
            lowQualityReply = finalReply;
            continue;
          }
          lastOnesaSuccessAt = Date.now();
          return { reply: finalReply, truncated: false };
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    if (lowQualityReply) {
      return { reply: safeFallbackReply, truncated: false };
    }
    if (lastError) throw lastError;
    throw new Error(
      `Onesa model returned an empty response for: ${[...candidates, ...fallbackCandidates].join(", ") || model}`
    );
  };

  if (provider === "openai_compatible") {
    const providers = buildCloudProviderTargets(config);
    if (providers.length === 0) {
      return await runOllamaFallback();
    }
    const requestCloudCompletion = async (
      providerTarget: ReturnType<typeof buildCloudProviderTargets>[number],
      targetModel: string,
      chatMessages: ChatMessage[]
    ) => {
      const anthropicInput = buildAnthropicInput(chatMessages);
      const response = await withRetry(
        () => {
          if (providerTarget.kind === "anthropic") {
            return axios.post(
              `${providerTarget.baseUrl}/v1/messages`,
              {
                model: targetModel,
                system: anthropicInput.system || undefined,
                messages: anthropicInput.chatMessages,
                temperature: 0.3,
                max_tokens: maxTokens,
              },
              {
                timeout: timeoutMs,
                headers: {
                  "x-api-key": providerTarget.apiKey,
                  "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
                  "Content-Type": "application/json",
                },
              }
            );
          }
          return axios.post(
            `${providerTarget.baseUrl}/chat/completions`,
            {
              model: targetModel,
              messages: chatMessages,
              temperature: 0.3,
              max_tokens: maxTokens,
            },
            {
              timeout: timeoutMs,
              headers: {
                Authorization: `Bearer ${providerTarget.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );
        },
        3,
        providerTarget.baseUrl
      );
      if (providerTarget.kind === "anthropic") {
        const finishReason = String(response.data?.stop_reason ?? "").trim();
        return {
          reply: extractAnthropicText(response.data),
          truncated: finishReason === "max_tokens",
          finishReason,
        };
      }
      const finishReason = String(response.data?.choices?.[0]?.finish_reason ?? "").trim();
      return {
        reply: String(response.data?.choices?.[0]?.message?.content ?? "").trim(),
        truncated: finishReason === "length",
        finishReason,
      };
    };

    let lastRateLimitError: any = null;
    let lastError: any = null;
    let longestBackoffMs = 0;

    for (const providerTarget of providers) {
      const providerBackoffMs = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
      if (providerBackoffMs > 0) {
        longestBackoffMs = Math.max(longestBackoffMs, providerBackoffMs);
        continue;
      }

      let shouldSkipEndpoint = false;
      for (const targetModel of providerTarget.models) {
        if (shouldSkipEndpoint || getEndpointBackoffRemainingMs(providerTarget.baseUrl) > 0) {
          break;
        }
        try {
          const firstPass = await requestCloudCompletion(providerTarget, targetModel, normalizedMessages);
          let reply = firstPass.reply;
          let truncated = firstPass.truncated;
          let finishReason = firstPass.finishReason;

          if (reply && truncated) {
            // Attempt one continuation pass when upstream stopped on token length.
            const continuationMessages: ChatMessage[] = [
              ...normalizedMessages,
              { role: "assistant", content: reply },
              {
                role: "user",
                content: "Continue exactly from where you stopped. Do not repeat previous text.",
              },
            ];
            try {
              const continuation = await requestCloudCompletion(providerTarget, targetModel, continuationMessages);
              if (continuation.reply) {
                reply = `${reply} ${continuation.reply}`.trim();
                truncated = continuation.truncated;
                finishReason = continuation.finishReason ?? finishReason;
              }
            } catch {
              // Keep initial partial reply when continuation fails.
            }
          }

          const guardedReply = enforceOnesaIdentityGuard(reply, responseLanguage);
          const finalReply = hasLanguageMetaReply(guardedReply)
            ? getOnesaLanguageFallbackReply(responseLanguage)
            : guardedReply;
          if (finalReply && !isLowQualityOnesaReply(finalReply) && !isMixedLanguageReply(finalReply, responseLanguage)) {
            lastOnesaSuccessAt = Date.now();
            return { reply: finalReply, truncated, finishReason };
          }
        } catch (error: any) {
          if (isRateLimitedUpstreamError(error)) {
            lastRateLimitError = error;
            const remaining = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
            longestBackoffMs = Math.max(longestBackoffMs, remaining, getRetryAfterMs(error) ?? 0);
            shouldSkipEndpoint = true;
            break;
          }
          const status = getUpstreamStatus(error);
          if (status === 401 || status === 403) {
            // Invalid key/permissions for this endpoint; skip to next provider.
            lastError = error;
            shouldSkipEndpoint = true;
            break;
          }
          lastError = error;
          // Try next model on same provider endpoint.
          continue;
        }
      }
    }

    if (lastRateLimitError) {
      try {
        return await runOllamaFallback();
      } catch {
        // Keep cloud rate-limit signal when local fallback is unavailable.
      }
      const retryAfterMs = longestBackoffMs > 0 ? longestBackoffMs : getRetryAfterMs(lastRateLimitError);
      if (retryAfterMs && retryAfterMs > 0) {
        const existing = Number(lastRateLimitError?.response?.headers?.["retry-after"] ?? 0);
        if (!existing) {
          lastRateLimitError.response = {
            ...(lastRateLimitError.response ?? {}),
            status: 429,
            headers: {
              ...(lastRateLimitError.response?.headers ?? {}),
              "retry-after": Math.ceil(retryAfterMs / 1000),
            },
            data: {
              ...(lastRateLimitError.response?.data ?? {}),
              message: "Rate limited",
            },
          };
        }
      }
      throw lastRateLimitError;
    }
    if (lastError) {
      try {
        return await runOllamaFallback();
      } catch {
        throw lastError;
      }
    }
    try {
      return await runOllamaFallback();
    } catch {
      return { reply: safeFallbackReply, truncated: false };
    }
  }
  return await runOllamaFallback();
}

async function getOnesaHealth() {
  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase } = config;
  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    const targetSummaries = providerTargets.map((target) => ({
      name: target.name,
      baseUrl: target.baseUrl,
    }));
    if (providerTargets.length === 0) {
      const claudeConfigured =
        Boolean(config.claudeBase) ||
        Boolean(config.claudeApiKey) ||
        Boolean(config.claudeModel) ||
        Boolean(config.claudeFallbackModel) ||
        config.claudeModelCandidates.length > 0;
      const cerebrasConfigured =
        Boolean(config.cerebrasBase) ||
        Boolean(config.cerebrasApiKey) ||
        Boolean(config.cerebrasModel) ||
        Boolean(config.cerebrasFallbackModel) ||
        config.cerebrasModelCandidates.length > 0;
      const perplexityConfigured =
        Boolean(config.perplexityBase) ||
        Boolean(config.perplexityApiKey) ||
        Boolean(config.perplexityModel) ||
        Boolean(config.perplexityFallbackModel) ||
        config.perplexityModelCandidates.length > 0;
      const tiers = [
        { name: "primary", base: config.openaiBase, key: config.openaiApiKey },
        { name: "secondary", base: config.secondaryOpenaiBase, key: config.secondaryOpenaiApiKey },
        { name: "tertiary", base: config.tertiaryOpenaiBase, key: config.tertiaryOpenaiApiKey },
        ...(claudeConfigured ? [{ name: "claude", base: config.claudeBase || "https://api.anthropic.com", key: config.claudeApiKey }] : []),
        ...(cerebrasConfigured ? [{ name: "cerebras", base: config.cerebrasBase || "https://api.cerebras.ai/v1", key: config.cerebrasApiKey }] : []),
        ...(perplexityConfigured ? [{ name: "perplexity", base: config.perplexityBase || "https://api.perplexity.ai", key: config.perplexityApiKey }] : []),
      ].filter((tier) => Boolean(tier.base));
      const missingKeyTiers = tiers.filter((tier) => isPlaceholderApiKey(tier.key)).map((tier) => tier.name);

      let message = "Cloud AI provider is missing configuration.";
      if (tiers.length > 0 && missingKeyTiers.length === tiers.length) {
        message = "Cloud AI API keys are missing.";
      } else if (missingKeyTiers.length > 0) {
        message = `Cloud AI API key missing for: ${missingKeyTiers.join(", ")}.`;
      }

      return {
        ok: false,
        provider,
        model,
        endpoint: openaiBase,
        providerTargets: targetSummaries,
        message,
      };
    }

    const failures: string[] = [];
    for (const providerTarget of providerTargets) {
      try {
        if (providerTarget.kind === "anthropic") {
          await axios.get(`${providerTarget.baseUrl}/v1/models`, {
            timeout: 5000,
            headers: {
              "x-api-key": providerTarget.apiKey,
              "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
              "Content-Type": "application/json",
            },
          });
        } else {
          await axios.get(`${providerTarget.baseUrl}/models`, {
            timeout: 5000,
            headers: {
              Authorization: `Bearer ${providerTarget.apiKey}`,
              "Content-Type": "application/json",
            },
          });
        }
        return { ok: true, provider, model, endpoint: providerTarget.baseUrl, providerTargets: targetSummaries };
      } catch (error: any) {
        const status = Number(error?.response?.status ?? 0);
        if (status === 404 || status === 405) {
          // Some providers may not expose a models list endpoint.
          return { ok: true, provider, model, endpoint: providerTarget.baseUrl, providerTargets: targetSummaries };
        }
        failures.push(`${providerTarget.name}:${String(error?.message ?? "unknown error")}`);
      }
    }
    return {
      ok: false,
      provider,
      model,
      endpoint: openaiBase,
      providerTargets: targetSummaries,
      message: `Cloud endpoint unreachable: ${failures.join(" | ") || "unknown error"}`,
    };
  }

  try {
    const response = await axios.get(`${ollamaBase}/api/tags`, { timeout: 5000 });
    const availableModels: string[] = Array.isArray(response.data?.models)
      ? response.data.models.map((m: any) => String(m?.name ?? ""))
      : [];
    const resolvedModel = resolveOllamaModelName(model, availableModels);
    const modelAvailable = Boolean(resolvedModel);
    return {
      ok: modelAvailable,
      provider,
      model,
      resolvedModel,
      endpoint: ollamaBase,
      modelAvailable,
      availableModels,
      message: modelAvailable ? undefined : `Model "${model}" not found in Ollama.`,
    };
  } catch (error: any) {
    return {
      ok: false,
      provider,
      model,
      endpoint: ollamaBase,
      message: `Ollama unreachable: ${String(error?.message ?? "unknown error")}`,
    };
  }
}

async function getOnesaReadiness() {
  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase, timeoutMs } = config;
  const fallbackEndpoint = provider === "openai_compatible" ? openaiBase : ollamaBase;
  const now = Date.now();
  const probeTimeout = Math.min(timeoutMs, 10000);

  if (onesaReadinessCache && now - onesaReadinessCache.checkedAt < ONESA_READINESS_CACHE_MS) {
    return onesaReadinessCache.value;
  }

  const remember = (value: OnesaReadiness) => {
    onesaReadinessCache = { checkedAt: Date.now(), value };
    return value;
  };

  const health = await getOnesaHealth();
  const endpoint = String((health as any)?.endpoint ?? fallbackEndpoint);
  if (!health.ok) {
    return remember({
      ok: false,
      ready: false,
      provider,
      model,
      endpoint,
      message: String(health.message ?? "Onesa is unavailable."),
    });
  }

  const recentSuccess = now - lastOnesaSuccessAt < ONESA_READINESS_GRACE_MS;
  if (recentSuccess) {
    return remember({
      ok: true,
      ready: true,
      provider,
      model,
      endpoint,
      resolvedModel: provider === "ollama" ? String((health as any)?.resolvedModel ?? model) : undefined,
    });
  }

  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    const targetSummaries = providerTargets.map((target) => ({
      name: target.name,
      baseUrl: target.baseUrl,
    }));
    if (providerTargets.length === 0) {
      return remember({
        ok: false,
        ready: false,
        provider,
        model,
        endpoint,
        providerTargets: targetSummaries,
        message: "Onesa is unavailable.",
      });
    }

    let observedRateLimit = false;
    let lastFailureMessage = "";

    for (const providerTarget of providerTargets) {
      const endpointBackoffMs = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
      if (endpointBackoffMs > 0) {
        observedRateLimit = true;
        continue;
      }

      try {
        if (providerTarget.kind === "anthropic") {
          await axios.get(`${providerTarget.baseUrl}/v1/models`, {
            timeout: probeTimeout,
            headers: {
              "x-api-key": providerTarget.apiKey,
              "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
              "Content-Type": "application/json",
            },
          });
        } else {
          await axios.get(`${providerTarget.baseUrl}/models`, {
            timeout: probeTimeout,
            headers: {
              Authorization: `Bearer ${providerTarget.apiKey}`,
              "Content-Type": "application/json",
            },
          });
        }
        return remember({
          ok: true,
          ready: true,
          provider,
          model: providerTarget.models[0] ?? model,
          endpoint: providerTarget.baseUrl,
          providerTargets: targetSummaries,
        });
      } catch (error: any) {
        const status = getUpstreamStatus(error);
        if (status === 404 || status === 405) {
          // Some providers do not expose a models endpoint consistently.
          return remember({
            ok: true,
            ready: true,
            provider,
            model: providerTarget.models[0] ?? model,
            endpoint: providerTarget.baseUrl,
            providerTargets: targetSummaries,
          });
        }
        if (isRateLimitedUpstreamError(error)) {
          observedRateLimit = true;
          const retryAfterMs = getRetryAfterMs(error) ?? 10000;
          const existing = onesaProviderBackoffUntilByEndpoint.get(providerTarget.baseUrl) ?? 0;
          onesaProviderBackoffUntilByEndpoint.set(
            providerTarget.baseUrl,
            Math.max(existing, Date.now() + Math.min(30000, retryAfterMs))
          );
          continue;
        }
        if (status === 401 || status === 403) {
          lastFailureMessage = "Authentication failed.";
          continue;
        }
        lastFailureMessage = String(error?.message ?? "probe failed");
      }
    }

    const globalBackoffMs = getGlobalBackoffRemainingMs();
    return remember({
      ok: false,
      ready: false,
      provider,
      model,
      endpoint,
      providerTargets: targetSummaries,
      message:
        observedRateLimit && globalBackoffMs > 0
          ? "Onesa is temporarily rate-limited."
          : lastFailureMessage
            ? "Onesa is unavailable."
            : "Onesa is unavailable.",
    });
  }

  try {
    const resolvedModel = String((health as any)?.resolvedModel ?? model);
    const response = await axios.post(
      `${ollamaBase}/api/generate`,
      {
        model: resolvedModel,
        prompt: "ready",
        stream: false,
        options: {
          temperature: 0,
          num_predict: 4,
        },
      },
      {
        timeout: probeTimeout,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const reply = String(response.data?.response ?? "").trim();
    const ready = reply.length > 0;
    if (ready) {
      lastOnesaSuccessAt = Date.now();
    }
    return remember({
      ok: ready,
      ready,
      provider,
      model,
      endpoint,
      resolvedModel,
      message: ready ? undefined : "Onesa is unavailable.",
    });
  } catch {
    const stillWarm = Date.now() - lastOnesaSuccessAt < ONESA_READINESS_GRACE_MS;
    return remember({
      ok: stillWarm,
      ready: stillWarm,
      provider,
      model,
      endpoint,
      resolvedModel: provider === "ollama" ? String((health as any)?.resolvedModel ?? model) : undefined,
      message: stillWarm ? undefined : "Onesa is unavailable.",
    });
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const allowedOrigins = getAllowedCorsOrigins();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          // Non-browser clients (curl/health checks/server-to-server).
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Idempotency-Key"],
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  const authRegisterLimiter = createRateLimiter({
    keyPrefix: "auth:register",
    windowMs: 5 * 60_000,
    maxRequests: 10,
    keyByUser: false,
  });
  const authLoginLimiter = createRateLimiter({
    keyPrefix: "auth:login",
    windowMs: 5 * 60_000,
    maxRequests: 12,
    keyByUser: false,
  });
  const authForgotLimiter = createRateLimiter({
    keyPrefix: "auth:forgot-password",
    windowMs: 5 * 60_000,
    maxRequests: 8,
    keyByUser: false,
  });
  const authResetLimiter = createRateLimiter({
    keyPrefix: "auth:reset-password",
    windowMs: 5 * 60_000,
    maxRequests: 12,
    keyByUser: false,
  });
  const authRefreshLimiter = createRateLimiter({
    keyPrefix: "auth:token-refresh",
    windowMs: 60_000,
    maxRequests: 30,
    keyByUser: true,
  });

  const sendLegacySuccess = <T extends Record<string, unknown>>(
    res: express.Response,
    statusCode: number,
    data: T
  ) => {
    return res.status(statusCode).json(successResponse(data));
  };

  const sendLegacyError = (
    res: express.Response,
    statusCode: number,
    code: string,
    message: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (Object.keys(extra).length > 0) {
      return res.status(statusCode).json({
        ...errorResponse(code, message),
        error: {
          code,
          message,
          details: extra,
        },
      });
    }
    return res.status(statusCode).json(errorResponse(code, message));
  };
  try {
    await initializeDatabase();
  } catch (error) {
    console.warn("[db] Database initialization failed. Continuing with in-memory fallback mode.");
    console.warn(error);
  }

  app.post("/api/auth/register", authRegisterLimiter, async (req, res) => {
    try {
      const { fullName, email, password, confirmPassword } = req.body ?? {};
      if (!fullName || !email || !password) {
        return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Full name, email, and password are required.");
      }
      if (String(password).length < 8) {
        return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Password must be at least 8 characters.");
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Passwords do not match.");
      }

      const existingUser = await findUserByEmail(String(email));
      if (existingUser) {
        return sendLegacyError(res, 409, "AUTH_EMAIL_EXISTS", "An account with this email already exists.");
      }

      const user = await createUser(String(fullName), String(email), hashPassword(String(password)));
      const session = await createSession(Number(user.id));
      setSessionCookie(res, session.token);
      const accessToken = issueAccessTokenForUser({
        id: Number(user.id),
        email: String(user.email ?? ""),
        full_name: String(user.full_name ?? ""),
      });

      return sendLegacySuccess(res, 201, {
        message: "Account created successfully.",
        user: { id: user.id, fullName: user.full_name, email: user.email },
        accessToken,
      });
    } catch (error: any) {
      if (isUserEmailConflictError(error)) {
        return sendLegacyError(res, 409, "AUTH_EMAIL_EXISTS", "An account with this email already exists.");
      }
      const isDev = (process.env.NODE_ENV ?? "development") !== "production";
      const detail = error?.message ? ` ${String(error.message)}` : "";
      return sendLegacyError(
        res,
        500,
        "AUTH_REGISTER_FAILED",
        isDev ? `Registration failed.${detail}` : "Registration failed."
      );
    }
  });

  app.post("/api/auth/login", authLoginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Email and password are required.");
      }

      const user = await findUserByEmail(String(email));
      if (!user || !verifyPassword(String(password), String(user.password_hash))) {
        return sendLegacyError(res, 401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.");
      }

      const session = await createSession(Number(user.id));
      setSessionCookie(res, session.token);
      const accessToken = issueAccessTokenForUser({
        id: Number(user.id),
        email: String(user.email ?? ""),
        full_name: String(user.full_name ?? ""),
      });

      return sendLegacySuccess(res, 200, {
        message: "Login successful.",
        user: { id: user.id, fullName: user.full_name, email: user.email },
        accessToken,
      });
    } catch {
      return sendLegacyError(res, 500, "AUTH_LOGIN_FAILED", "Login failed.");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = await resolveAuthToken(req);
      if (token) await deleteSession(token);
      clearSessionCookie(res);
      return sendLegacySuccess(res, 200, { message: "Logged out." });
    } catch {
      return sendLegacyError(res, 500, "AUTH_LOGOUT_FAILED", "Logout failed.");
    }
  });

  app.post("/api/auth/forgot-password", authForgotLimiter, async (req, res) => {
    try {
      const { email } = req.body ?? {};
      if (!email) return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Email is required.");

      const user = await findUserByEmail(String(email));
      if (user) {
        const tokenData = await createPasswordResetToken(Number(user.id));
        const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.NODE_ENV === "production" ? 3000 : 5000}`;
        const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(tokenData.token)}`;
        await sendResetEmail(String(user.email), resetUrl);
      }

      return sendLegacySuccess(res, 200, { message: "If this email exists, a reset link has been sent." });
    } catch {
      return sendLegacyError(res, 500, "AUTH_FORGOT_PASSWORD_FAILED", "Unable to process password reset request.");
    }
  });

  app.post("/api/auth/reset-password", authResetLimiter, async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body ?? {};
      if (!token || !password) return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Token and password are required.");
      if (String(password).length < 8) return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Password must be at least 8 characters.");
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return sendLegacyError(res, 400, "AUTH_VALIDATION_FAILED", "Passwords do not match.");
      }

      const resetToken = await consumePasswordResetToken(String(token));
      if (!resetToken) return sendLegacyError(res, 400, "AUTH_INVALID_RESET_TOKEN", "Reset token is invalid or expired.");

      await updateUserPassword(Number(resetToken.user_id), hashPassword(String(password)));
      return sendLegacySuccess(res, 200, { message: "Password reset successful. Please sign in." });
    } catch {
      return sendLegacyError(res, 500, "AUTH_RESET_PASSWORD_FAILED", "Password reset failed.");
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = await resolveAuthToken(req);
      if (!token) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");

      const session = await getSession(token);
      if (!session) return sendLegacyError(res, 401, "AUTH_SESSION_EXPIRED", "Session expired.");

      const user = await findUserById(Number(session.user_id));
      if (!user) return sendLegacyError(res, 401, "AUTH_USER_NOT_FOUND", "User not found.");

      return sendLegacySuccess(res, 200, {
        user: { id: user.id, fullName: user.full_name, email: user.email },
      });
    } catch {
      return sendLegacyError(res, 500, "AUTH_ME_FAILED", "Failed to resolve current user.");
    }
  });

  app.post("/api/auth/token/refresh", authRefreshLimiter, async (req, res) => {
    try {
      const user = await resolveAuthUser(req);
      if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
      const accessToken = issueAccessTokenForUser({
        id: Number(user.id),
        email: String(user.email ?? ""),
        full_name: String((user as any).full_name ?? ""),
      });
      return sendLegacySuccess(res, 200, {
        message: "Token refreshed.",
        accessToken,
      });
    } catch {
      return sendLegacyError(res, 500, "AUTH_REFRESH_FAILED", "Failed to refresh token.");
    }
  });

  app.post("/api/auth/kyc/verify", async (req, res) => {
    if ((process.env.NODE_ENV ?? "development").toLowerCase() === "production") {
      return sendLegacyError(res, 403, "KYC_SELF_VERIFY_DISABLED", "KYC self-verify is unavailable in production.");
    }
    try {
      const user = await resolveAuthUser(req);
      if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
      const updated = await setUserKycVerified(Number(user.id), true);
      if (!updated) return sendLegacyError(res, 404, "AUTH_USER_NOT_FOUND", "User not found.");
      return sendLegacySuccess(res, 200, {
        message: "KYC status updated.",
        user: {
          id: updated.id,
          fullName: updated.full_name,
          email: updated.email,
          kycVerified: updated.kyc_verified,
        },
      });
    } catch {
      return sendLegacyError(res, 500, "KYC_VERIFY_FAILED", "Failed to update KYC status.");
    }
  });

  app.get("/api/search", async (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (!q) return sendLegacySuccess(res, 200, { query: "", count: 0, results: [] });

    try {
      const routeIndex = [
        { title: "Trade", href: "/trade", category: "Trade", tags: ["export", "germany", "market", "trade", "business", "commerce", "sectors"] },
        { title: "Tourism", href: "/tourism", category: "Tourism", tags: ["visit", "travel", "attractions", "victoria falls"] },
        { title: "Investment", href: "/investment", category: "Investment", tags: ["money", "capital", "projects", "masuwe", "sez"] },
        { title: "Care", href: "/care", category: "Care", tags: ["funeral", "policy", "nyaradzo", "family", "cover"] },
        { title: "Technology", href: "/technology", category: "Technology", tags: ["ai", "onesa", "innovation", "tech"] },
        { title: "Impact", href: "/impact", category: "Impact", tags: ["stories", "impact", "cases"] },
        { title: "NTIR Database", href: "/ntir", category: "Trade", tags: ["register", "ntir", "verification"] },
        { title: "Regulations", href: "/regulations", category: "Compliance", tags: ["regulation", "compliance", "licensing"] },
      ];

      const routeMatches = routeIndex.filter((item) =>
        [item.title, item.category, ...item.tags].some((value) => value.toLowerCase().includes(q))
      );
      const ntirMatches = (await searchNtirEntities(q)).slice(0, 10).map((row: any) => ({
        title: row.name,
        href: "/ntir",
        category: "NTIR",
        summary: `${row.sector} - ${row.location}`,
      }));
      const storyMatches = (await getSuccessStories(false))
        .filter((story: any) =>
          [story.title, story.category, story.story, story.author].some((value) => String(value ?? "").toLowerCase().includes(q))
        )
        .slice(0, 10)
        .map((story: any) => ({
          title: story.title,
          href: "/impact",
          category: story.category || "Impact",
          summary: String(story.story ?? "").slice(0, 140),
        }));

      const results = [...routeMatches, ...ntirMatches, ...storyMatches];
      return sendLegacySuccess(res, 200, { query: q, count: results.length, results });
    } catch {
      return sendLegacyError(res, 500, "SEARCH_FAILED", "Unable to run search right now.");
    }
  });

  app.post("/api/feature-notifications", async (req, res) => {
    try {
      const feature = String(req.body?.feature ?? "").trim();
      if (!feature) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Feature is required.");

      const token = await resolveAuthToken(req);
      if (!token) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");

      const session = await getSession(token);
      if (!session) return sendLegacyError(res, 401, "AUTH_SESSION_EXPIRED", "Session expired.");

      const user = await findUserById(Number(session.user_id));
      if (!user) return sendLegacyError(res, 401, "AUTH_USER_NOT_FOUND", "User not found.");

      const result = await createFeatureNotification(Number(user.id), String(user.email), feature);

      if (result.created) {
        const fromEmail = await getNotifyFromEmail();
        const safeFeature = feature.replace(/[_-]+/g, " ").trim();
        const userSubject = `Notify request received: ${safeFeature}`;
        const userHtml = `<p>Hello,</p>
<p>Your notify request for <strong>${safeFeature}</strong> has been saved.</p>
<p>We will email you when this feature becomes available.</p>`;
        const userText = `Your notify request for ${safeFeature} has been saved. We will email you when this feature becomes available.`;
        await sendEmailMessageSafe(
          {
            // User confirmation email must not block notify persistence.
            to: String(user.email),
            subject: userSubject,
            html: userHtml,
            text: userText,
            from: fromEmail,
          },
          "feature-notifications:user-confirmation"
        );

        const alertEmails = await getNotifyAlertEmails();
        if (alertEmails.length > 0) {
          const adminSubject = `New feature notify request: ${safeFeature}`;
          const adminHtml = `<p><strong>New notify request</strong></p>
<p>Feature: ${safeFeature}</p>
<p>User email: ${String(user.email)}</p>
<p>User id: ${Number(user.id)}</p>`;
          const adminText = `New notify request. Feature: ${safeFeature}. User email: ${String(user.email)}. User id: ${Number(user.id)}.`;
          await sendEmailMessageSafe({
            to: alertEmails,
            subject: adminSubject,
            html: adminHtml,
            text: adminText,
            from: fromEmail,
          }, "feature-notifications:admin-alert");
        }
      }

      return sendLegacySuccess(res, 200, {
        message: result.created ? "Notify request saved." : "Notify request already exists.",
        created: result.created,
        feature,
        email: String(user.email),
      });
    } catch (error: any) {
      const isDev = (process.env.NODE_ENV ?? "development") !== "production";
      const detail = error?.message ? ` ${String(error.message)}` : "";
      return sendLegacyError(
        res,
        500,
        "FEATURE_NOTIFICATION_FAILED",
        isDev ? `Unable to save notify request.${detail}` : "Unable to save notify request."
      );
    }
  });

  app.get("/api/impact", async (_req, res) => {
    try {
      const stories = await getSuccessStories(false);
      return sendLegacySuccess(res, 200, { count: stories.length, stories });
    } catch {
      return sendLegacyError(res, 500, "IMPACT_LOAD_FAILED", "Unable to load impact stories.");
    }
  });

  app.get("/api/admin/overview", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const [notifyRows, ntirRows, storyRows] = await Promise.all([
      getFeatureNotifications(),
      getNtirEntities(),
      getSuccessStories(true),
    ]);
    return sendLegacySuccess(res, 200, {
      ok: true,
      user: { id: user.id, fullName: user.full_name, email: user.email },
      counts: {
        notifyRequests: notifyRows.length,
        ntirEntities: ntirRows.length,
        successStories: storyRows.length,
      },
    });
  });

  app.get("/api/admin/notification-settings", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const [alertEmailsRaw, fromEmailRaw] = await Promise.all([
      getAdminSetting(ADMIN_SETTING_NOTIFY_ALERT_EMAILS),
      getAdminSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL),
    ]);

    const alertEmails = parseCsvEmails(alertEmailsRaw);
    const fromEmail = fromEmailRaw && isValidEmail(fromEmailRaw)
      ? fromEmailRaw
      : String(process.env.FROM_EMAIL ?? "no-reply@zigd-platform.com").trim();

    return sendLegacySuccess(res, 200, {
      alert_emails: alertEmails.join(", "),
      from_email: fromEmail,
    });
  });

  app.put("/api/admin/notification-settings", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const alertEmails = String(req.body?.alert_emails ?? "").trim();
    const fromEmail = String(req.body?.from_email ?? "").trim();
    const parsedAlertEmails = parseCsvEmails(alertEmails);
    const hasInvalidAlertEmail =
      alertEmails.length > 0 &&
      parsedAlertEmails.length !==
        alertEmails
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean).length;
    if (hasInvalidAlertEmail) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "One or more alert emails are invalid.");
    }
    if (fromEmail.length > 0 && !isValidEmail(fromEmail)) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "From email is invalid.");
    }

    await Promise.all([
      upsertAdminSetting(ADMIN_SETTING_NOTIFY_ALERT_EMAILS, parsedAlertEmails.join(", ")),
      upsertAdminSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL, fromEmail),
    ]);

    return sendLegacySuccess(res, 200, {
      alert_emails: parsedAlertEmails.join(", "),
      from_email: fromEmail,
      ok: true,
    });
  });

  app.get("/api/admin/notify-requests", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const [featureRows, shopRows] = await Promise.all([
      getFeatureNotifications(),
      getShopRestockNotifications(),
    ]);
    const rows = [
      ...featureRows.map((row: any) => ({
        id: Number(row.id),
        email: String(row.email),
        feature: String(row.feature),
        created_at: row.created_at,
      })),
      ...shopRows.map((row: any) => ({
        id: Number(row.id) + 1_000_000,
        email: String(row.email),
        feature: `shop_restock_${String(row.product_slug ?? "")}`,
        created_at: row.created_at,
      })),
    ].sort((a, b) => {
      const aTs = new Date(a.created_at ?? 0).getTime();
      const bTs = new Date(b.created_at ?? 0).getTime();
      return bTs - aTs;
    });
    return sendLegacySuccess(res, 200, { count: rows.length, rows });
  });

  app.get("/api/admin/ntir", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const rows = await getNtirEntities();
    return sendLegacySuccess(res, 200, { count: rows.length, rows });
  });

  app.post("/api/admin/ntir", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const name = String(req.body?.name ?? "").trim();
    const sector = String(req.body?.sector ?? "").trim();
    const location = String(req.body?.location ?? "").trim();
    const verificationStatus = String(req.body?.verification_status ?? "Pending").trim() === "Verified" ? "Verified" : "Pending";
    if (!name || !sector || !location) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Name, sector, and location are required.");

    const row = await createNtirEntity(name, sector, location, verificationStatus);
    return sendLegacySuccess(res, 201, { row });
  });

  app.put("/api/admin/ntir/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Invalid entity id.");
    const payload = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : undefined,
      sector: req.body?.sector !== undefined ? String(req.body.sector).trim() : undefined,
      location: req.body?.location !== undefined ? String(req.body.location).trim() : undefined,
      verification_status:
        req.body?.verification_status !== undefined
          ? String(req.body.verification_status).trim() === "Verified"
            ? ("Verified" as const)
            : ("Pending" as const)
          : undefined,
    };
    const row = await updateNtirEntity(id, payload);
    if (!row) return sendLegacyError(res, 404, "NOT_FOUND", "NTIR entity not found.");
    return sendLegacySuccess(res, 200, { row });
  });

  app.get("/api/admin/impact", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const stories = await getSuccessStories(true);
    return sendLegacySuccess(res, 200, { count: stories.length, stories });
  });

  app.post("/api/admin/impact", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const payload = {
      title: String(req.body?.title ?? "").trim(),
      category: String(req.body?.category ?? "").trim(),
      image: String(req.body?.image ?? "").trim(),
      story: String(req.body?.story ?? "").trim(),
      testimonial: String(req.body?.testimonial ?? "").trim(),
      author: String(req.body?.author ?? "").trim(),
      role: String(req.body?.role ?? "").trim(),
      revenue: String(req.body?.revenue ?? "").trim(),
      jobs: String(req.body?.jobs ?? "").trim(),
      markets: String(req.body?.markets ?? "").trim(),
      is_published: req.body?.is_published === false ? (0 as const) : (1 as const),
    };
    if (!payload.title || !payload.category || !payload.story || !payload.author) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Title, category, story, and author are required.");
    }

    const story = await createSuccessStory(payload);
    return sendLegacySuccess(res, 201, { story });
  });

  app.put("/api/admin/impact/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Invalid story id.");

    const payload: {
      title?: string;
      category?: string;
      image?: string;
      story?: string;
      testimonial?: string;
      author?: string;
      role?: string;
      revenue?: string;
      jobs?: string;
      markets?: string;
      is_published?: 0 | 1;
    } = {};

    if (req.body?.title !== undefined) payload.title = String(req.body.title).trim();
    if (req.body?.category !== undefined) payload.category = String(req.body.category).trim();
    if (req.body?.image !== undefined) payload.image = String(req.body.image).trim();
    if (req.body?.story !== undefined) payload.story = String(req.body.story).trim();
    if (req.body?.testimonial !== undefined) payload.testimonial = String(req.body.testimonial).trim();
    if (req.body?.author !== undefined) payload.author = String(req.body.author).trim();
    if (req.body?.role !== undefined) payload.role = String(req.body.role).trim();
    if (req.body?.revenue !== undefined) payload.revenue = String(req.body.revenue).trim();
    if (req.body?.jobs !== undefined) payload.jobs = String(req.body.jobs).trim();
    if (req.body?.markets !== undefined) payload.markets = String(req.body.markets).trim();
    if (req.body?.is_published !== undefined) {
      payload.is_published = req.body.is_published === 0 || req.body.is_published === false ? 0 : 1;
    }

    const story = await updateSuccessStory(id, payload);
    if (!story) return sendLegacyError(res, 404, "NOT_FOUND", "Impact story not found.");
    return sendLegacySuccess(res, 200, { story });
  });

  app.get("/api/admin/shop-products", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const rows = await getShopProductsAdmin();
    return sendLegacySuccess(res, 200, { count: rows.length, rows });
  });

  app.post("/api/admin/shop-products", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");

    const slug = String(req.body?.slug ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const category = String(req.body?.category ?? "").trim().toLowerCase();
    const description = String(req.body?.description ?? "").trim();
    const image_url = String(req.body?.image_url ?? "").trim();
    const price_cents = Number(req.body?.price_cents ?? 0);
    const currency = String(req.body?.currency ?? "EUR").trim().toUpperCase();
    const stock_qty = Math.max(0, Math.floor(Number(req.body?.stock_qty ?? 0)));
    const is_active = req.body?.is_active === 0 || req.body?.is_active === false ? (0 as const) : (1 as const);

    if (!slug || !name || !description || !image_url) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Slug, name, description and image are required.");
    }
    if (!["sports", "crafts", "food"].includes(category)) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Category must be sports, crafts, or food.");
    }
    if (!Number.isFinite(price_cents) || price_cents <= 0) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Price must be greater than zero.");
    }

    try {
      const row = await createShopProductAdmin({
        slug,
        name,
        category: category as "sports" | "crafts" | "food",
        description,
        image_url,
        price_cents: Math.floor(price_cents),
        currency: currency || "EUR",
        stock_qty,
        is_active,
      });
      return sendLegacySuccess(res, 201, { row });
    } catch (error: any) {
      return sendLegacyError(res, 400, "SHOP_PRODUCT_CREATE_FAILED", String(error?.message ?? "Unable to create product."));
    }
  });

  app.put("/api/admin/shop-products/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Invalid product id.");

    const rawCategory = req.body?.category !== undefined ? String(req.body.category).trim().toLowerCase() : undefined;
    if (rawCategory !== undefined && !["sports", "crafts", "food"].includes(rawCategory)) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Category must be sports, crafts, or food.");
    }
    const rawPrice = req.body?.price_cents !== undefined ? Number(req.body.price_cents) : undefined;
    if (rawPrice !== undefined && (!Number.isFinite(rawPrice) || rawPrice <= 0)) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Price must be greater than zero.");
    }
    const rawStock = req.body?.stock_qty !== undefined ? Number(req.body.stock_qty) : undefined;
    if (rawStock !== undefined && (!Number.isFinite(rawStock) || rawStock < 0)) {
      return sendLegacyError(res, 400, "VALIDATION_FAILED", "Stock must be zero or greater.");
    }

    const payload: any = {};
    if (req.body?.slug !== undefined) payload.slug = String(req.body.slug).trim();
    if (req.body?.name !== undefined) payload.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) payload.description = String(req.body.description).trim();
    if (req.body?.image_url !== undefined) payload.image_url = String(req.body.image_url).trim();
    if (rawCategory !== undefined) payload.category = rawCategory;
    if (rawPrice !== undefined) payload.price_cents = Math.floor(rawPrice);
    if (req.body?.currency !== undefined) payload.currency = String(req.body.currency).trim().toUpperCase();
    if (rawStock !== undefined) payload.stock_qty = Math.floor(rawStock);
    if (req.body?.is_active !== undefined) payload.is_active = req.body.is_active === 0 || req.body.is_active === false ? 0 : 1;

    const beforeRow = await getShopProductById(id);
    const row = await updateShopProductAdmin(id, payload);
    if (!row) return sendLegacyError(res, 404, "NOT_FOUND", "Product not found.");

    const prevStock = Number((beforeRow as any)?.stock_qty ?? 0);
    const nextStock = Number((row as any)?.stock_qty ?? 0);
    const restocked = prevStock <= 0 && nextStock > 0;
    if (restocked) {
      await notifyRestockSubscribersAndAdmins({
        productId: Number((row as any)?.id ?? id),
        productName: String((row as any)?.name ?? ""),
        productSlug: String((row as any)?.slug ?? ""),
        stockQty: Math.max(0, Math.floor(nextStock)),
        updatedByEmail: String(user.email ?? ""),
      });
    }

    return sendLegacySuccess(res, 200, { row });
  });

  app.delete("/api/admin/shop-products/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return sendLegacyError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized.");
    if (!isAdminEmail(String(user.email))) return sendLegacyError(res, 403, "AUTH_FORBIDDEN", "Admin access required.");
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendLegacyError(res, 400, "VALIDATION_FAILED", "Invalid product id.");
    const deleted = await deleteShopProductAdmin(id);
    if (!deleted) return sendLegacyError(res, 404, "NOT_FOUND", "Product not found.");
    return sendLegacySuccess(res, 200, { ok: true });
  });

  app.get("/api/ntir/search", async (req, res) => {
    const query = String(req.query.q ?? "");
    try {
      const results = await searchNtirEntities(query);
      return sendLegacySuccess(res, 200, { query, count: results.length, results });
    } catch {
      return sendLegacyError(res, 500, "NTIR_SEARCH_FAILED", "Unable to search NTIR database.");
    }
  });

  app.get("/api/shop/products", async (req, res) => {
    try {
      const category = String(req.query.category ?? "").trim();
      const result = await listShopProducts(category);
      return sendLegacySuccess(res, 200, {
        count: result.products.length,
        products: result.products,
        source: result.source,
        cached: result.cached,
      });
    } catch {
      return sendLegacyError(res, 500, "SHOP_PRODUCTS_FAILED", "Unable to load shop products.");
    }
  });

  app.post("/api/shop/restock-notifications", async (req, res) => {
    try {
      const productIdRaw = req.body?.productId;
      const productSlug = String(req.body?.productSlug ?? "").trim();
      const productName = String(req.body?.productName ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();

      if (!productSlug || !productName) {
        return sendLegacyError(res, 400, "VALIDATION_FAILED", "Product details are required.");
      }
      if (!isValidEmail(email)) {
        return sendLegacyError(res, 400, "VALIDATION_FAILED", "A valid email address is required.");
      }

      const productId =
        productIdRaw == null || !Number.isFinite(Number(productIdRaw))
          ? null
          : Math.max(1, Math.floor(Number(productIdRaw)));

      const result = await createShopRestockNotification({
        productId,
        productSlug,
        productName,
        email,
      });

      if (result.created) {
        const fromEmail = await getNotifyFromEmail();
        const userSubject = `Notify request received: ${productName}`;
        const userHtml = `<p>Hello,</p>
<p>Your notify request for <strong>${productName}</strong> has been saved.</p>
<p>We will email you when stock is available.</p>`;
        const userText = `Your notify request for ${productName} has been saved. We will email you when stock is available.`;
        await sendEmailMessageSafe(
          { to: email, subject: userSubject, html: userHtml, text: userText, from: fromEmail },
          "shop-restock-notifications:user-confirmation"
        );

        const alertEmails = await getNotifyAlertEmails();
        if (alertEmails.length > 0) {
          const adminSubject = `New shop notify request: ${productName}`;
          const adminHtml = `<p><strong>New shop restock notify request</strong></p>
<p>Product: ${productName}</p>
<p>Slug: ${productSlug}</p>
<p>Subscriber email: ${email}</p>`;
          const adminText = `New shop restock notify request. Product: ${productName}. Slug: ${productSlug}. Subscriber email: ${email}.`;
          await sendEmailMessageSafe(
            { to: alertEmails, subject: adminSubject, html: adminHtml, text: adminText, from: fromEmail },
            "shop-restock-notifications:admin-alert"
          );
        }
      }

      return sendLegacySuccess(res, 200, {
        created: result.created,
        message: result.created
          ? "Notify request saved. We will email you when stock is available."
          : "You are already subscribed for this product.",
        record: result.record,
      });
    } catch {
      return sendLegacyError(res, 500, "SHOP_NOTIFY_FAILED", "Unable to save notify request.");
    }
  });

  app.post("/api/shop/orders", async (req, res) => {
    try {
      const customerName = String(req.body?.customerName ?? "").trim();
      const customerEmail = String(req.body?.customerEmail ?? "").trim();
      const shippingCountry = String(req.body?.shippingCountry ?? "").trim();
      const shippingCity = String(req.body?.shippingCity ?? "").trim();
      const shippingAddress = String(req.body?.shippingAddress ?? "").trim();
      const paymentMethod = String(req.body?.paymentMethod ?? "").trim();
      const items = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!customerName || !customerEmail || !shippingCountry || !shippingCity || !shippingAddress) {
        return sendLegacyError(res, 400, "VALIDATION_FAILED", "Customer and shipping fields are required.");
      }
      const allowedPaymentMethods =
        process.env.NODE_ENV === "production"
          ? ["stripe", "paypal", "amazon_pay"]
          : ["stripe", "paypal", "amazon_pay", "dummy_gateway"];
      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return sendLegacyError(res, 400, "VALIDATION_FAILED", "Invalid payment method.");
      }
      if (items.length === 0) {
        return sendLegacyError(res, 400, "VALIDATION_FAILED", "At least one cart item is required.");
      }

      const order = await createShopOrder({
        customerName,
        customerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        paymentMethod: paymentMethod as "stripe" | "paypal" | "amazon_pay" | "dummy_gateway",
        items: items.map((item: any) => ({
          productId: Number(item?.productId),
          quantity: Number(item?.quantity),
        })),
      });
      return sendLegacySuccess(res, 201, { order });
    } catch (error: any) {
      const message = String(error?.message ?? "Unable to create order.");
      return sendLegacyError(res, 400, "SHOP_ORDER_CREATE_FAILED", message);
    }
  });

  app.get("/api/shop/orders/:orderRef", async (req, res) => {
    try {
      const orderRef = String(req.params.orderRef ?? "").trim();
      const order = await getShopOrderByRef(orderRef);
      if (!order) return sendLegacyError(res, 404, "NOT_FOUND", "Order not found.");
      return sendLegacySuccess(res, 200, { order });
    } catch {
      return sendLegacyError(res, 500, "SHOP_ORDER_LOAD_FAILED", "Unable to load order.");
    }
  });

  app.post("/api/shop/orders/:orderRef/confirm-payment", async (req, res) => {
    try {
      const orderRef = String(req.params.orderRef ?? "").trim();
      const paymentReference = String(req.body?.paymentReference ?? "").trim();
      const updated = await confirmShopOrderPayment(orderRef, paymentReference);
      if (!updated) return sendLegacyError(res, 404, "NOT_FOUND", "Order not found.");
      return sendLegacySuccess(res, 200, { order: updated });
    } catch {
      return sendLegacyError(res, 500, "SHOP_ORDER_CONFIRM_FAILED", "Unable to confirm payment.");
    }
  });

  registerApiRoutes(app, {
    backend: {
      db,
      serverStartedAt: SERVER_STARTED_AT,
    },
    onesa: {
      generateOnesaReply,
      normalizeOnesaLanguage,
      enforceOnesaIdentityGuard,
      getOnesaHealth,
      getOnesaReadiness,
      getUpstreamStatus,
      getRetryAfterMs,
      getGlobalBackoffRemainingMs,
      isRateLimitedUpstreamError,
      onChatSuccess: () => {
        lastOnesaSuccessAt = Date.now();
        onesaReadinessCache = null;
      },
    },
  });
  registerFinancialRoutes(app);
  registerDomainModules(app);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const parsePort = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const port = Math.floor(parsed);
    if (port <= 0 || port > 65535) return null;
    return port;
  };

  const envMode = String(process.env.NODE_ENV ?? "development").toLowerCase();
  const isProduction = envMode === "production";
  const isTest = envMode === "test";
  const requestedPort =
    (isProduction
      ? parsePort(process.env.PORT) ?? parsePort(process.env.PROD_PORT) ?? 3000
      : isTest
        ? parsePort(process.env.TEST_PORT) ?? parsePort(process.env.PORT) ?? 5002
        : parsePort(process.env.DEV_PORT) ?? parsePort(process.env.PORT) ?? 5001);
  const allowPortFallback =
    String(process.env.ALLOW_PORT_FALLBACK ?? "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";

  const listenWithFallback = async (startPort: number, maxAttempts = 20): Promise<number> => {
    let attempt = 0;
    let candidate = startPort;

    while (attempt < maxAttempts) {
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (error: NodeJS.ErrnoException) => {
            server.off("listening", onListening);
            reject(error);
          };
          const onListening = () => {
            server.off("error", onError);
            resolve();
          };

          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(candidate);
        });
        return candidate;
      } catch (error: any) {
        if (error?.code !== "EADDRINUSE") {
          throw error;
        }
        candidate += 1;
        attempt += 1;
      }
    }

    throw new Error(`No open port found starting from ${startPort} after ${maxAttempts} attempts.`);
  };

  let activePort = requestedPort;
  if (allowPortFallback) {
    activePort = await listenWithFallback(requestedPort);
  } else {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(requestedPort);
    });
  }
  if (activePort !== requestedPort) {
    console.warn(`[server] Port ${requestedPort} is in use. Switched to ${activePort}.`);
  }
  console.log(`Server running on http://localhost:${activePort}/`);
}

startServer().catch(console.error);
