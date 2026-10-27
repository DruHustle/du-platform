import { travelRedirects } from "./travelRoutes";
import investmentProjectRoutes from "./investmentProjectRoutes.json";

export const PUBLIC_SITE_ORIGIN = "https://www.diasporaunlocked.com";

export type RouteSeoInput = {
  pathname: string;
  search?: string;
  product?: { slug: string; name: string; description: string };
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
const SITE_DEFAULT_TITLE = `${SITE_NAME} | Products, Travel & Opportunities`;
const SITE_DEFAULT_DESCRIPTION =
  "Explore Zimbabwean products, travel information, business opportunities and practical AI help on Diaspora Unlocked, wherever you live.";
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
  const requestedPath = normalizePathname(input.pathname);
  const pathname = travelRedirects[requestedPath] ?? requestedPath;
  const searchParams = new URLSearchParams(input.search ?? "");
  const searchQuery = searchParams.get("q")?.trim() ?? "";

  if (pathname === "/") {
    return buildSeo(
      SITE_DEFAULT_TITLE,
      SITE_DEFAULT_DESCRIPTION,
      "/",
      "Diaspora Unlocked — connect with Zimbabwe"
    );
  }

  if (pathname === "/shop/interest")
    return buildSeo(
      "Product interest | Diaspora Unlocked",
      "Confirm or cancel a one-time product alert.",
      pathname,
      "Product interest",
      "noindex,nofollow"
    );
  if (pathname === "/shop/order-status")
    return buildSeo(
      "Private request status | Diaspora Unlocked",
      "View your assisted order request securely.",
      pathname,
      "Request status",
      "noindex,nofollow"
    );
  if (["/legal-notice", "/delivery-and-returns"].includes(pathname))
    return buildSeo(
      "Operator and pilot procedures | Diaspora Unlocked",
      "Operator details and draft delivery, payment, cancellation and returns procedures.",
      pathname,
      "Operator and pilot procedures",
      "noindex,follow"
    );
  if (input.product && pathname === `/shop/product/${input.product.slug}`)
    return buildSeo(
      `${input.product.name} | Shop | Diaspora Unlocked`,
      input.product.description,
      pathname,
      input.product.name
    );
  if (pathname.startsWith("/shop/product/"))
    return buildSeo(
      "Product information | Diaspora Unlocked",
      "Product details and indicative prices. Register interest for a one-time availability alert with no order, reservation or payment.",
      pathname,
      "Product information"
    );
  if (pathname === "/shop") {
    return buildSeo(
      "Shop Zimbabwe Products | Diaspora Unlocked",
      "Browse Zimbabwean food, crafts and supporter apparel. Build a basket and send an order request to confirm availability, delivery and payment details.",
      "/shop",
      "Shop Zimbabwe Products"
    );
  }

  if (pathname === "/shop/products") {
    return buildSeo(
      "Zimbabwe Product Catalogue | Diaspora Unlocked",
      "Browse Zimbabwean products and register interest for a one-time availability alert. No order, reservation or payment; sales are not open yet.",
      "/shop/products",
      "Zimbabwe Product Catalogue"
    );
  }

  if (pathname === "/investment") {
    return buildSeo(
      "Zimbabwe Business & Investment Ideas | Diaspora Unlocked",
      "Explore practical business ideas in Zimbabwe, plan a small first project, and research existing projects and business requirements from home or abroad.",
      "/investment",
      "Zimbabwe Business & Investment Ideas"
    );
  }

  if (pathname === "/investment/opportunities") {
    return buildSeo(
      "Zimbabwe Project Profiles | Diaspora Unlocked",
      "Explore Zimbabwe project profiles by sector. Research listed promoters and confirm current scope, financial terms and approvals independently.",
      "/investment/opportunities",
      "Zimbabwe Project Profiles"
    );
  }

  if (pathname.startsWith("/investment/projects/")) {
    const slug = pathname.slice("/investment/projects/".length);
    if (Object.hasOwn(investmentProjectRoutes, slug)) {
      const projectName =
        investmentProjectRoutes[slug as keyof typeof investmentProjectRoutes];
      return buildSeo(
        `${projectName} | Diaspora Unlocked`,
        `Review the ${projectName} project profile on Diaspora Unlocked as a starting point for research. Confirm scope, availability, financial terms and approvals independently.`,
        pathname,
        projectName
      );
    }
  }

  if (pathname === "/ntir") {
    return buildSeo(
      "NTIR Business Directory | Diaspora Unlocked",
      "Search business records maintained by Diaspora Unlocked. NTIR is a platform directory, not an official national register or independent verification service.",
      "/ntir",
      "NTIR Business Directory"
    );
  }

  if (pathname === "/technology") {
    return buildSeo(
      "Onesa AI Tools & Practical Technology | Diaspora Unlocked",
      "Use Onesa chat, draft trip planning, AR destination guidance and 360° demos. Explore practical digital ideas for Zimbabweans at home and abroad.",
      "/technology",
      "Onesa AI Tools & Practical Technology"
    );
  }

  const travelPages: Record<string, [string, string]> = {
    "/travel/flights": [
      "Flights to Southern Africa",
      "Search Kiwi.com flights to, from and within Southern Africa. Review supplier-reported amounts, flight details and conditions, then keep options in your trip.",
    ],
    "/travel/stays": [
      "Stays in Southern Africa",
      "Search Pilot stays by dates, rooms and travellers. Review reported prices and confirm full-stay costs, room terms and availability with the provider.",
    ],
    "/travel/car-hire": [
      "Car Hire in Southern Africa",
      "Prepare airport car-hire searches and understand deposits, insurance excess and cross-border conditions.",
    ],
    "/travel/explore": [
      "Southern Africa Travel Guides",
      "Compare Zimbabwe route costs, plan Johannesburg–Victoria Falls, choose Cape Town family stays and understand car-hire deposits.",
    ],
    "/travel/my-trips": [
      "My Private Trips",
      "Review your browser draft and privately saved trips and searches.",
    ],
  };
  if (travelPages[pathname]) {
    const [title, description] = travelPages[pathname];
    return buildSeo(
      `${title} | Diaspora Unlocked`,
      description,
      pathname,
      title,
      pathname === "/travel/my-trips" || input.search
        ? "noindex,follow"
        : DEFAULT_ROBOTS
    );
  }
  if (pathname === "/travel") {
    return buildSeo(
      "Travel Southern Africa | Diaspora Unlocked",
      "Explore Southern Africa, search flights and stays, and keep private trips and planning allowances. Book directly with providers; car hire uses a public search handoff.",
      "/travel",
      "Travel Southern Africa"
    );
  }

  if (pathname === "/onesa-ai-chat") {
    return buildSeo(
      "Onesa AI Chat for Zimbabwe Guidance | Diaspora Unlocked",
      "Ask Onesa about Zimbabwean products, travel ideas and project information. Get explanations and starting points, then confirm important details with providers.",
      "/onesa-ai-chat",
      "Onesa AI Chat for Zimbabwe Guidance"
    );
  }

  if (pathname === "/travel/planner") {
    return buildSeo(
      "Zimbabwe Trip Planner | Onesa AI",
      "Create a draft Zimbabwe itinerary with indicative budgets and download a PDF. Prices and availability are not live; bookings are made directly with providers.",
      "/travel/planner",
      "Zimbabwe Trip Planner"
    );
  }

  if (pathname === "/travel/virtual-experience") {
    return buildSeo(
      "360° VR Demo | Onesa AI",
      "Explore the Sample City panoramic demo with scene controls and optional narration. This is a demonstration, not a Zimbabwe destination tour.",
      "/travel/virtual-experience",
      "360° VR Demo"
    );
  }

  if (pathname === "/travel/augmented-experience") {
    return buildSeo(
      "Zimbabwe Augmented Reality Guide | Onesa AI",
      "Explore destination information with optional camera, location and narration controls. This guide provides place context rather than object recognition or navigation.",
      "/travel/augmented-experience",
      "Zimbabwe Augmented Reality Guide"
    );
  }

  if (pathname === "/login") {
    return buildSeo(
      "Sign In | Diaspora Unlocked",
      "Sign in to an existing Diaspora Unlocked account. Browsing and order requests do not require an account.",
      "/login",
      "Sign In",
      "noindex,follow"
    );
  }

  if (pathname === "/register") {
    return buildSeo(
      "Create Account | Diaspora Unlocked",
      "Create a platform account. Browsing, order requests and newsletter subscriptions do not require an account.",
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
      ? `Review search results for ${searchQuery} across Diaspora Unlocked products, destinations, project information and guides.`
      : "Search across Diaspora Unlocked products, destinations, project information and guides.";
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

  if (pathname === "/newsletter") {
    return buildSeo(
      "Newsletter Preferences | Diaspora Unlocked",
      "Confirm or manage your Diaspora Unlocked newsletter subscription.",
      "/newsletter",
      "Newsletter Preferences",
      "noindex,nofollow"
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
