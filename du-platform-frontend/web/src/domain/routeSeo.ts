import { travelRedirects } from "./travelRoutes";
import businessGuideTitles from "./businessGuideTitles.json";
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
const SITE_DEFAULT_TITLE = `Plan your next trip home | ${SITE_NAME}`;
const SITE_DEFAULT_DESCRIPTION =
  "Search flights and family stays in Zimbabwe and Southern Africa, browse Zimbabwean products, and find funeral cover providers.";
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
      "Plan your next trip home"
    );
  }

  if (pathname === "/shop/interest")
    return buildSeo(
      "Product availability alert | Diaspora Unlocked",
      "Confirm or cancel a one-time product alert.",
      pathname,
      "Product availability alert",
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
  if (pathname === "/delivery-and-returns")
    return buildSeo(
      "Delivery, payment and returns | Diaspora Unlocked",
      "Ask the shop about planned delivery from Germany, quotes, payments, cancellations and returns.",
      pathname,
      "Delivery, payment and returns",
      "noindex,follow"
    );
  if (pathname === "/legal-notice")
    return buildSeo(
      "Operator and contact details | Diaspora Unlocked",
      "Find contact and registration details for Onesa UG, the operator of Diaspora Unlocked in Heidelberg, Germany.",
      pathname,
      "Operator and contact details",
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
      "Check product details, indicative prices and availability. Open the product to see its email alert options.",
      pathname,
      "Product information"
    );
  if (pathname === "/shop") {
    return buildSeo(
      "Shop Zimbabwe Products | Diaspora Unlocked",
      "Browse Zimbabwean food, crafts and supporter apparel. Check each product for availability and one-time email alert options.",
      "/shop",
      "Shop Zimbabwe Products"
    );
  }

  if (pathname === "/shop/products") {
    return buildSeo(
      "Zimbabwe Product Catalogue | Diaspora Unlocked",
      "Browse Zimbabwean products. Open a product to see its details, availability and email alert options.",
      "/shop/products",
      "Zimbabwe Product Catalogue"
    );
  }

  if (pathname === "/care") {
    return buildSeo(
      "Funeral cover and repatriation to Zimbabwe | Diaspora Unlocked",
      "Find official provider information about funeral costs for a relative in Zimbabwe or arranging repatriation from abroad. Check both countries of residence with the provider.",
      "/care",
      "Funeral cover for families in Zimbabwe and abroad"
    );
  }

  if (pathname === "/business-guides" || pathname === "/investment") {
    return buildSeo(
      "Zimbabwe Business Guides | Diaspora Unlocked",
      "Explore practical business ideas in Zimbabwe, plan a small first project, and research existing projects and business requirements from home or abroad.",
      "/business-guides",
      "Zimbabwe Business Guides"
    );
  }

  if (pathname.startsWith("/business-guides/")) {
    const slug = pathname.slice("/business-guides/".length);
    if (Object.hasOwn(businessGuideTitles, slug)) {
      const title = businessGuideTitles[slug as keyof typeof businessGuideTitles];
      return buildSeo(`${title} | Zimbabwe Business Guides`,
        `Read the ${title.toLowerCase()} guide to plan your first project in Zimbabwe. Check customers, costs and progress before you commit.`,
        pathname, title);
    }
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

  if (pathname === "/onesa" || pathname === "/technology") {
    return buildSeo(
      "Onesa | Diaspora Unlocked",
      "Plan three days in Victoria Falls or ask Onesa about a product. Edit your draft itinerary before checking prices and booking with providers.",
      "/onesa",
      "Onesa"
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
      "Explore Southern Africa",
      "Read regional travel guides, explore Zimbabwean destinations and draft a Zimbabwe itinerary with Onesa. Confirm travel details directly with providers.",
    ],
    "/travel/weather": [
      "Weather forecasts for your journey",
      "Search a city or destination, choose a place or use your approximate location to see MET Norway weather forecasts, temperature, rain and wind.",
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
      pathname === "/travel/my-trips" || Array.from(searchParams.keys()).some(key => key !== "lng")
        ? "noindex,follow"
        : DEFAULT_ROBOTS
    );
  }
  if (pathname === "/travel") {
    return buildSeo(
      "Travel Southern Africa | Diaspora Unlocked",
      "Search flights and family stays, plan car hire, check the weather and save trip ideas. The provider you choose handles the booking and support.",
      "/travel",
      "Travel Southern Africa"
    );
  }

  if (pathname === "/onesa-ai-chat") {
    return buildSeo(
      "Onesa AI for Zimbabwe & Southern Africa | Diaspora Unlocked",
      "Ask Onesa about Zimbabwean products, Southern African travel and business ideas. Get starting points, then confirm important details with providers.",
      "/onesa-ai-chat",
      "Onesa AI for Zimbabwe & Southern Africa"
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
      "Sign in to see your saved trips and searches. You can browse the site as a guest.",
      "/login",
      "Sign In",
      "noindex,follow"
    );
  }

  if (pathname === "/register") {
    return buildSeo(
      "Create Account | Diaspora Unlocked",
      "Create an account to keep private trips and searches. You can browse or sign up for email updates as a guest.",
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

  if (pathname === "/account-deletion") {
    return buildSeo(
      "Request Account Deletion | Diaspora Unlocked",
      "Sign in to request deletion of your Diaspora Unlocked account and associated personal data.",
      "/account-deletion",
      "Request account deletion",
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

// Use the same translated copy that visitors see when they switch language.
const localizedPages: Record<string, [string, string]> = {
  "/": ["home.hero_title", "home.hero_subtitle"],
  "/shop": ["shop.landing.title", "home.tiles.shop.description"],
  "/shop/products": ["shop.products.title", "home.tiles.shop.description"],
  "/investment/opportunities": ["nav.active_projects", "nav.active_projects_desc"],
  "/ntir": ["investment.ntir.title", "investment.ntir.subtitle"],
  "/regulations": ["regulations.title", "regulations.subtitle"],
  "/onesa-ai-chat": ["onesa.title", "onesa.welcome"],
  "/travel/virtual-experience": ["tourism.vr.seo.title", "tourism.vr.seo.description"],
  "/travel/augmented-experience": ["tourism.ar.seo.title", "tourism.ar.seo.description"],
  "/shop/order-status": ["pilot.request_status", "pilot.open_receipt_link"],
  "/cookie-settings": ["cookies.settings.title", "cookies.settings.optional_description"],
  "/account-deletion": ["deletion.title", "deletion.details"],
  "/admin": ["admin.title", "admin.subtitle"],
  "/404": ["notfound.subtitle", "notfound.message2"],
  "/shop/interest": ["product_interest.title", "product_interest.scope"],
  "/travel": ["travel.title", "travel.description"],
  "/travel/flights": ["travel.flights", "travel.purpose.flights"],
  "/travel/stays": ["travel.stays", "travel.purpose.stays"],
  "/travel/car-hire": ["travel.car-hire", "travel.purpose.car-hire"],
  "/travel/my-trips": ["travel.my-trips", "travel.private-note"],
  "/travel/weather": ["weather.title", "weather.description"],
  "/travel/explore": ["travel.explore-title", "travel.explore-description"],
  "/travel/planner": [
    "tourism.onesa.trip_planner.title",
    "tourism.onesa.trip_planner.subtitle",
  ],
  "/onesa": ["tech.landing.title", "tech.landing.description"],
  "/care": ["care.title", "care.intro"],
  "/business-guides": [
    "investment.landing.title",
    "investment.landing.description",
  ],
  "/login": ["auth.login", "auth.login_subtitle"],
  "/register": ["auth.create_account", "auth.register_subtitle"],
  "/forgot-password": ["auth.forgot.title", "auth.forgot.subtitle"],
  "/reset-password": ["auth.reset.title", "auth.reset.subtitle"],
  "/newsletter": ["newsletter_preferences.manage_title", "newsletter_preferences.confirm_help"],
  "/search": ["search.results.title_default", "search.description"],
  "/legal-notice": ["pilot.operator_title", "pilot.operator_summary"],
  "/delivery-and-returns": ["pilot.procedures_title", "pilot.procedures_summary"],
  "/privacy-policy": ["legal.privacy.title", "legal.privacy.p1"],
  "/terms-of-service": ["legal.terms.title", "legal.terms.p1"],
};

export function openGraphLocale(language: string) {
  return ({ de: "de_DE", sn: "sn_ZW", nd: "nd_ZW" } as Record<string,string>)[language] ?? "en_ZW";
}

export function localizeRouteSeo(seo: RouteSeo, language: string, t: (key: string) => string,
  product?: { name: string; description: string }): RouteSeo {
  if (language === "en") return seo;
  let keys = localizedPages[seo.canonicalPath];
  const guide = seo.canonicalPath.match(/^\/business-guides\/([a-z-]+)$/)?.[1];
  const project = seo.canonicalPath.match(/^\/investment\/projects\/([a-z_]+)$/)?.[1];
  if (guide) keys = [`investment.opportunities.${guide}.title`, `investment.opportunities.${guide}.summary`];
  if (project) keys = [`investment.projects.${project}.title`, `investment.projects.${project}.description`];
  if (!keys && !product) return seo;
  const bodyHeading = product?.name ?? t(keys[0]);
  const title = product ? `${product.name} | ${t("nav.shop")} | Diaspora Unlocked` : `${bodyHeading} | Diaspora Unlocked`;
  const description = product?.description ?? t(keys[1]);
  return { ...seo, title, bodyHeading, description, socialTitle: title, socialDescription: description };
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
  siteUrl: string,
  language = "en"
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
    .replace(/(<html\b[^>]*?\blang=")[^"]*"/i, (_, prefix) => `${prefix}${escapeHtml(language)}"`)
    .replace(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i, () => `<meta property="og:locale" content="${openGraphLocale(language)}" />`)
    .replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta name="robots" content="${robots}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta property="og:title" content="${socialTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta property="og:description" content="${socialDescription}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta property="og:url" content="${canonical}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta name="twitter:title" content="${socialTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
      () => `<meta name="twitter:description" content="${socialDescription}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i,
      () => `<link rel="canonical" href="${canonical}" />`
    )
    .replace(
      /<h1 class="seo-h1">[\s\S]*?<\/h1>/i,
      () => `<h1 class="seo-h1">${heading}</h1>`
    );
}
