export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// 2025 Zimbabwe Economic Data
export const ECONOMIC_DATA = {
  gdp: {
    growth: 6.6, // 2025 projection
    yoyQ2: 11.04, // Year-over-year Q2 growth
    value: 28.5, // Billion USD
    year: 2025
  },
  mining: {
    totalRevenue: 5.56, // Billion USD (2024 total)
    mineralExports: 3.4, // Billion USD (2025 mineral exports)
    sectors: {
      gold: { contribution: 35, value: 1.95 },
      lithium: { contribution: 25, value: 1.39 },
      platinum: { contribution: 20, value: 1.11 },
      diamonds: { contribution: 10, value: 0.56 },
      other: { contribution: 10, value: 0.56 }
    }
  },
  agriculture: {
    wheatProduction: 640000, // tons (record)
    tobaccoExports: 850, // Million USD
    maizeProduction: 2.5, // Million tons
    horticultureExports: 120 // Million USD
  },
  manufacturing: {
    gdpContribution: 15.3, // Percentage
    growth: 4.2 // Annual growth rate
  },
  services: {
    gdpContribution: 52.1, // Percentage
    tourismRevenue: 1.2 // Billion USD
  },
  trade: {
    totalExports: 6.8, // Billion USD
    totalImports: 7.2, // Billion USD
    tradeBalance: -0.4 // Billion USD
  },
  diaspora: {
    remittances: 1.8, // Billion USD
    population: 3.5, // Million (estimated)
    investmentPotential: 500 // Million USD (annual)
  }
};

// Sector-specific data for visualizations
export const SECTOR_DATA = {
  mining: [
    { name: "Gold", value: 35, revenue: 1.95 },
    { name: "Lithium", value: 25, revenue: 1.39 },
    { name: "Platinum", value: 20, revenue: 1.11 },
    { name: "Diamonds", value: 10, revenue: 0.56 },
    { name: "Other", value: 10, revenue: 0.56 }
  ],
  agriculture: [
    { name: "Tobacco", value: 850, unit: "M USD" },
    { name: "Wheat", value: 640, unit: "K tons" },
    { name: "Maize", value: 2500, unit: "K tons" },
    { name: "Horticulture", value: 120, unit: "M USD" }
  ],
  gdpGrowth: [
    { year: "2021", growth: 8.5 },
    { year: "2022", growth: 6.5 },
    { year: "2023", growth: 5.5 },
    { year: "2024", growth: 5.8 },
    { year: "2025", growth: 6.6 }
  ]
};
