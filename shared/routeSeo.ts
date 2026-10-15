import investmentProjectRoutes from "./investmentProjectRoutes.json";

export const PUBLIC_SITE_ORIGIN = "https://www.diasporaunlocked.com";

export type RouteSeoInput = {
  pathname: string;
  search?: string;
};

export type RouteSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  socialTitle?: string;
  socialDescription?: string;
  bodyHeading: string;
};

const SITE_NAME = "Diaspora Unlocked";
const SITE_DEFAULT_TITLE = `${SITE_NAME} | Zimbabwe Diaspora Services`;
const SITE_DEFAULT_DESCRIPTION =
  "Explore one platform for Zimbabwe tourism, investment, shopping, and AI support built for diaspora households and partners.";
const DEFAULT_ROBOTS = "index,follow";

function normalizePathname(pathname: string): string {
  const trimmed = String(pathname || "/").trim() || "/";
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? "/";
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.endsWith("/") ? withoutQuery.slice(0, -1) : withoutQuery;
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function buildSeo(
  title: string,
  description: string,
  canonicalPath: string,
  bodyHeading: string,
  robots = DEFAULT_ROBOTS
): RouteSeo {
  return {
    title,
    description,
    canonicalPath,
    robots,
    socialTitle: title,
    socialDescription: description,
    bodyHeading,
  };
}

export function resolveRouteSeo(input: RouteSeoInput): RouteSeo {
  const pathname = normalizePathname(input.pathname);
  const searchParams = new URLSearchParams(input.search ?? "");
  const searchQuery = searchParams.get("q")?.trim() ?? "";

  if (pathname === "/") {
    return buildSeo(
      SITE_DEFAULT_TITLE,
      SITE_DEFAULT_DESCRIPTION,
      "/",
      "Diaspora Unlocked Zimbabwe Diaspora Services"
    );
  }

  if (pathname === "/shop") {
    return buildSeo(
      "Shop Zimbabwe Products | Diaspora Unlocked",
      "Browse curated Zimbabwean food, gifts, crafts, and lifestyle products with diaspora-friendly delivery flows, trusted sourcing, and clearer checkout guidance.",
      "/shop",
      "Shop Zimbabwe Products"
    );
  }

  if (pathname === "/shop/products") {
    return buildSeo(
      "Zimbabwe Product Catalogue | Diaspora Unlocked",
      "Explore the live Diaspora Unlocked Zimbabwe product catalogue with curated staples, artisan goods, pantry essentials, and diaspora-ready delivery information.",
      "/shop/products",
      "Zimbabwe Product Catalogue"
    );
  }

  if (pathname === "/investment") {
    return buildSeo(
      "Zimbabwe Investment Opportunities | Diaspora Unlocked",
      "Review Zimbabwe investment themes, sector opportunities, and diaspora participation pathways across hospitality, agriculture, manufacturing, technology, and infrastructure.",
      "/investment",
      "Zimbabwe Investment Opportunities"
    );
  }

  if (pathname === "/investment/opportunities") {
    return buildSeo(
      "Active Investment Projects in Zimbabwe | Diaspora Unlocked",
      "Browse active Zimbabwe investment opportunities with sector context, return ranges, participation thresholds, and diaspora-ready project summaries.",
      "/investment/opportunities",
      "Active Investment Projects in Zimbabwe"
    );
  }

  if (pathname.startsWith("/investment/projects/")) {
    const slug = pathname.slice("/investment/projects/".length);
    if (Object.hasOwn(investmentProjectRoutes, slug)) {
      const projectName =
        investmentProjectRoutes[slug as keyof typeof investmentProjectRoutes];
      return buildSeo(
        `${projectName} | Diaspora Unlocked`,
        `Review the ${projectName} opportunity on Diaspora Unlocked, including sector focus, participation context, and diaspora-oriented investment detail.`,
        pathname,
        projectName
      );
    }
  }

  if (pathname === "/ntir") {
    return buildSeo(
      "Zimbabwe Investment Registry Search | Diaspora Unlocked",
      "Search Zimbabwe investment and registry information through Diaspora Unlocked with guided access to structured records and discovery tools.",
      "/ntir",
      "Zimbabwe Investment Registry Search"
    );
  }

  if (pathname === "/technology") {
    return buildSeo(
      "Onesa AI and Zimbabwe Technology | Diaspora Unlocked",
      "Explore Onesa AI, Zimbabwe-focused digital infrastructure, and practical technology use cases across tourism, investment, logistics, and education.",
      "/technology",
      "Onesa AI and Zimbabwe Technology"
    );
  }

  if (pathname === "/tourism") {
    return buildSeo(
      "Zimbabwe Tourism and Trip Planning | Diaspora Unlocked",
      "Discover Zimbabwe attractions, safari and heritage destinations, and diaspora-ready trip planning tools with guided itinerary and experience support.",
      "/tourism",
      "Zimbabwe Tourism and Trip Planning"
    );
  }

  if (pathname === "/onesa-ai-chat") {
    return buildSeo(
      "Onesa AI Chat for Zimbabwe Guidance | Diaspora Unlocked",
      "Use Onesa AI for Zimbabwe-focused travel, investment, technology, and practical local guidance built around local context instead of generic global answers.",
      "/onesa-ai-chat",
      "Onesa AI Chat for Zimbabwe Guidance"
    );
  }

  if (pathname === "/onesa-ai-book-trip") {
    return buildSeo(
      "Zimbabwe Trip Planner | Onesa AI",
      "Plan Zimbabwe travel with AI-assisted routing, attraction selection, budget guidance, and downloadable itinerary support for visitors and diaspora return journeys.",
      "/onesa-ai-book-trip",
      "Zimbabwe Trip Planner"
    );
  }

  if (pathname === "/onesa-ai-tourism-virtual-experience") {
    return buildSeo(
      "Zimbabwe Virtual Tourism Experience | Onesa AI",
      "Preview Zimbabwe destinations through an interactive virtual tourism experience with guided narration, landmark context, and immersive destination exploration.",
      "/onesa-ai-tourism-virtual-experience",
      "Zimbabwe Virtual Tourism Experience"
    );
  }

  if (pathname === "/onesa-ai-tourism-augmented-experience") {
    return buildSeo(
      "Zimbabwe Augmented Tourism Guide | Onesa AI",
      "Use an augmented tourism guide to explore Zimbabwe destinations with location-aware context, camera support, narration controls, and Onesa AI assistance.",
      "/onesa-ai-tourism-augmented-experience",
      "Zimbabwe Augmented Tourism Guide"
    );
  }

  if (pathname === "/login") {
    return buildSeo(
      "Sign In | Diaspora Unlocked",
      "Secure sign-in page for existing Diaspora Unlocked users.",
      "/login",
      "Sign In",
      "noindex,follow"
    );
  }

  if (pathname === "/register") {
    return buildSeo(
      "Create Account | Diaspora Unlocked",
      "Create a Diaspora Unlocked account to access platform services and updates.",
      "/register",
      "Create Account",
      "noindex,follow"
    );
  }

  if (pathname === "/forgot-password") {
    return buildSeo(
      "Reset Password | Diaspora Unlocked",
      "Request a password reset for your Diaspora Unlocked account.",
      "/forgot-password",
      "Reset Password",
      "noindex,follow"
    );
  }

  if (pathname === "/reset-password") {
    return buildSeo(
      "Set New Password | Diaspora Unlocked",
      "Choose a new password for your Diaspora Unlocked account.",
      "/reset-password",
      "Set New Password",
      "noindex,follow"
    );
  }

  if (pathname === "/privacy-policy") {
    return buildSeo(
      "Privacy Policy | Diaspora Unlocked",
      "Read the Diaspora Unlocked privacy policy to understand how personal data is handled across platform services and communications.",
      "/privacy-policy",
      "Privacy Policy"
    );
  }

  if (pathname === "/terms-of-service") {
    return buildSeo(
      "Terms of Service | Diaspora Unlocked",
      "Review the Diaspora Unlocked terms of service governing use of the platform, services, and related digital experiences.",
      "/terms-of-service",
      "Terms of Service"
    );
  }

  if (pathname === "/cookie-settings") {
    return buildSeo(
      "Cookie Settings | Diaspora Unlocked",
      "Manage cookie preferences and learn how Diaspora Unlocked uses cookies to support functionality, analytics, and service improvements.",
      "/cookie-settings",
      "Cookie Settings"
    );
  }

  if (pathname === "/regulations") {
    return buildSeo(
      "Zimbabwe Regulations and Compliance | Diaspora Unlocked",
      "Explore Zimbabwe regulatory guidance, diaspora compliance context, and supporting references across investment, trade, and platform participation.",
      "/regulations",
      "Zimbabwe Regulations and Compliance"
    );
  }

  if (pathname === "/search") {
    const title = searchQuery
      ? `Search results for ${searchQuery} | Diaspora Unlocked`
      : "Search Diaspora Unlocked";
    const description = searchQuery
      ? `Review search results for ${searchQuery} across Diaspora Unlocked modules, guides, and service pathways.`
      : "Search across Diaspora Unlocked modules, guides, and service pathways.";
    return buildSeo(
      title,
      description,
      "/search",
      searchQuery
        ? `Search results for ${searchQuery}`
        : "Search Diaspora Unlocked",
      "noindex,follow"
    );
  }

  if (pathname === "/admin") {
    return buildSeo(
      "Admin Dashboard | Diaspora Unlocked",
      "Administrative dashboard for authorized Diaspora Unlocked operators.",
      "/admin",
      "Admin Dashboard",
      "noindex,nofollow"
    );
  }

  if (pathname === "/404") {
    return buildSeo(
      "Page Not Found | Diaspora Unlocked",
      "The page you requested could not be found on Diaspora Unlocked.",
      "/404",
      "Page Not Found",
      "noindex,nofollow"
    );
  }

  return buildSeo(
    "Page Not Found | Diaspora Unlocked",
    "The page you requested could not be found on Diaspora Unlocked.",
    "/404",
    "Page Not Found",
    "noindex,nofollow"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resolveCanonicalUrl(
  siteUrl: string,
  canonicalPath: string
): string {
  let normalizedSiteUrl = String(siteUrl || "")
    .trim()
    .replace(/\/+$/, "");
  // Both public domain variants resolve to www. Keep HTML, SPA navigation,
  // social metadata, and the sitemap on that same canonical origin.
  if (
    /^https?:\/\/(?:www\.)?diasporaunlocked\.com(?::\d+)?$/i.test(
      normalizedSiteUrl
    )
  ) {
    normalizedSiteUrl = PUBLIC_SITE_ORIGIN;
  }
  const normalizedPath = ensureLeadingSlash(canonicalPath).replace(
    /\/{2,}/g,
    "/"
  );
  return normalizedSiteUrl
    ? `${normalizedSiteUrl}${normalizedPath}`
    : normalizedPath;
}

export function injectSeoIntoHtml(
  html: string,
  seo: RouteSeo,
  siteUrl: string
): string {
  const canonicalUrl = resolveCanonicalUrl(siteUrl, seo.canonicalPath);
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const socialTitle = escapeHtml(seo.socialTitle ?? seo.title);
  const socialDescription = escapeHtml(
    seo.socialDescription ?? seo.description
  );
  const robots = escapeHtml(seo.robots);
  const heading = escapeHtml(seo.bodyHeading);
  const canonical = escapeHtml(canonicalUrl);

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="robots" content="${robots}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:title" content="${socialTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:description" content="${socialDescription}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:url" content="${canonical}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:title" content="${socialTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:description" content="${socialDescription}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(
      /<h1 class="seo-h1">[\s\S]*?<\/h1>/i,
      `<h1 class="seo-h1">${heading}</h1>`
    );
}
