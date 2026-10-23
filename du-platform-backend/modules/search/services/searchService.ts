import { TOURISM_SEARCH_DESTINATIONS } from "../../../../shared/tourismSearch";
import { SearchRepository } from "../repositories/searchRepository";

const ROUTE_INDEX = [
  ...TOURISM_SEARCH_DESTINATIONS.map(({ title, id, aliases }) => ({
    title,
    href: `/tourism#${id}`,
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
    title: "Tourism",
    href: "/tourism",
    category: "Tourism",
    tags: ["visit", "travel", "attractions", "victoria falls"],
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

export class SearchService {
  constructor(private readonly repository = new SearchRepository()) {}

  async search(query: string) {
    const normalizedQuery = String(query ?? "")
      .trim()
      .toLowerCase();
    if (!normalizedQuery) {
      return { query: "", count: 0, results: [] };
    }

    const routeMatches = ROUTE_INDEX.filter(item =>
      [item.title, item.category, ...item.tags].some(value =>
        String(value).toLowerCase().includes(normalizedQuery)
      )
    );
    const [entities, products] = await Promise.all([
      this.repository.searchNtir(normalizedQuery),
      this.repository.publishedProducts(),
    ]);
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
    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
}
