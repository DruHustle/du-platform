import { TOURISM_SEARCH_DESTINATIONS } from "../../../domain/tourismSearch";
import { SearchRepository } from "../repositories/searchRepository";

const ROUTE_INDEX = [
  ...TOURISM_SEARCH_DESTINATIONS.map(({ title, id, aliases }) => ({
    title,
    href: `/travel#${id}`,
    category: "Destination",
    tags: ["travel", "destination", ...aliases],
  })),
  ...[
    ["Apparel", "sports", "jersey clothing rugby cricket"],
    ["Arts and crafts", "crafts", "sculpture basket gifts"],
    ["Food and drinks", "food", "beverages groceries juice cordial"],
  ].map(([title, category, aliases]) => ({
    title,
    href: `/shop/products?category=${category}`,
    category: "Collection",
    tags: aliases.split(" "),
  })),
  {
    title: "Shop",
    href: "/shop",
    category: "Shop",
    tags: ["shopping", "products", "gifts", "marketplace"],
  },
  {
    title: "Onesa AI",
    href: "/onesa-ai-chat",
    category: "Technology",
    tags: ["chat", "assistant", "help"],
  },
  {
    title: "Travel Southern Africa",
    href: "/travel",
    category: "Tourism",
    tags: ["visit", "travel", "attractions", "victoria falls"],
  },
  {
    title: "Flights",
    href: "/travel/flights",
    category: "Tourism",
    tags: ["flight", "cheap flights", "compare flights", "airfare", "plane tickets",
      "Flüge", "Fluege", "Ndege", "Indizamtshina"],
  },
  {
    title: "Places to stay",
    href: "/travel/stays",
    category: "Tourism",
    tags: ["stays", "accommodation", "hotel", "hotels", "lodging",
      "Unterkünfte", "Unterkuenfte", "Pekugara", "Indawo zokuhlala"],
  },
  {
    title: "Car hire",
    href: "/travel/car-hire",
    category: "Tourism",
    tags: ["car rental", "car rentals", "rental car", "rental cars", "rent a car",
      "Mietwagen", "Kurenda motokari", "Ukuqhatsha imota"],
  },
  {
    title: "My trips",
    href: "/travel/my-trips",
    category: "Tourism",
    tags: ["saved trips", "saved searches", "Meine Reisen", "Nzendo dzangu", "Uhambo lwami"],
  },
  {
    title: "Weather",
    href: "/travel/weather",
    category: "Tourism",
    tags: ["weather forecast", "temperature", "rainfall",
      "Wetter", "Mamiriro ekunze", "Isimo sezulu"],
  },
  {
    title: "Explore destinations",
    href: "/travel/explore",
    category: "Tourism",
    tags: ["destination guides", "places to visit", "Entdecken", "Ongorora", "Hlola"],
  },
  {
    title: "Plan a Zimbabwe itinerary",
    href: "/travel/planner",
    category: "Tourism",
    tags: ["trip planner", "travel planner", "itinerary planner",
      "Simbabwe-Reise mit Onesa entwerfen", "Ronga rwendo rweZimbabwe naOnesa",
      "Hlela uhambo lweZimbabwe loOnesa"],
  },
  {
    title: "Investment",
    href: "/investment",
    category: "Investment",
    tags: ["money", "capital", "projects", "masuwe", "sez"],
  },
  {
    title: "Technology",
    href: "/technology",
    category: "Technology",
    tags: ["ai", "onesa", "innovation", "tech"],
  },
  {
    title: "NTIR Database",
    href: "/ntir",
    category: "Investment",
    tags: ["register", "ntir", "verification"],
  },
  {
    title: "Regulations",
    href: "/regulations",
    category: "Compliance",
    tags: ["regulation", "compliance", "licensing"],
  },
];

function normalizeRouteText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s.,?!-]+/g, " ")
    .trim();
}

export class SearchService {
  constructor(private readonly repository = new SearchRepository()) {}

  async search(query: string) {
    const normalizedQuery = String(query ?? "")
      .trim()
      .toLowerCase();
    if (!normalizedQuery) {
      return { query: "", count: 0, results: [] };
    }

    const routeQuery = normalizeRouteText(normalizedQuery);
    const routeMatches = ROUTE_INDEX.filter(item => {
      if (!routeQuery) return false;
      const terms = [item.title, ...item.tags].map(normalizeRouteText);
      if (
        normalizeRouteText(item.category).includes(routeQuery) ||
        terms.some(term => term.includes(routeQuery))
      ) {
        return true;
      }
      // Recognise the planning tool inside queries such as "hotels in Harare".
      return (
        item.href.startsWith("/travel/") &&
        terms.some(term => ` ${routeQuery} `.includes(` ${term} `))
      );
    });
    const [directory, catalogue] = await Promise.allSettled([
      this.repository.searchNtir(normalizedQuery),
      this.repository.publishedProducts(),
    ]);
    const entities = directory.status === "fulfilled" ? directory.value : [];
    const products = catalogue.status === "fulfilled" ? catalogue.value : [];
    const productMatches = products
      .filter(
        (p: any) =>
          Number(p.is_active) === 1 &&
          `${p.name} ${p.description} ${p.category} ${p.slug.replace(/[-_]/g, " ")}`
            .toLowerCase()
            .includes(normalizedQuery)
      )
      .sort(
        (a: any, b: any) => Number(b.stock_qty > 0) - Number(a.stock_qty > 0)
      )
      .slice(0, 30)
      .map((p: any) => ({
        title: p.name,
        href: `/shop/products?product=${encodeURIComponent(p.slug)}`,
        category: "Product",
        summary: `${p.description} · ${p.stock_qty > 0 ? "Available now" : "Currently unavailable"}`,
      }));
    const ntirMatches = entities.slice(0, 10).map((row: any) => ({
      title: row.name,
      href: `/ntir?q=${encodeURIComponent(row.name)}`,
      category: "NTIR",
      summary: `${row.sector} - ${row.location}`,
    }));
    const results = [...productMatches, ...routeMatches, ...ntirMatches];
    const unavailable = [directory, catalogue].find(source => source.status === "rejected");
    if (unavailable && results.length === 0) throw unavailable.reason;
    return {
      ...(unavailable && { partial: true }),
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
}
