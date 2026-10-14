import { SearchRepository } from "../repositories/searchRepository";

const ROUTE_INDEX = [
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
    const ntirMatches = (await this.repository.searchNtir(normalizedQuery))
      .slice(0, 10)
      .map((row: any) => ({
        title: row.name,
        href: "/ntir",
        category: "NTIR",
        summary: `${row.sector} - ${row.location}`,
      }));
    const results = [...routeMatches, ...ntirMatches];
    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
}
