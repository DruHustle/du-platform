// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function startServer() {
  const app = express();
  const server = createServer(app);

  // 1. API ROUTES (Must come BEFORE the catch-all '*')
  app.get("/api/economic-stats", (_req, res) => {
    res.json({
      remittances: 1500,
      gdp: 28000,
      diasporaPopulation: 3000000,
      exportValue: 4500,
      growthRate: 5.3,
      sectorData: [
        { name: "Mining", growth: 8.2 },
        { name: "Agriculture", growth: 4.5 },
        { name: "Tourism", growth: 6.1 },
        { name: "Manufacturing", growth: 3.2 }
      ],
      remittanceImpact: [
        { sector: "Education", percentage: 35 },
        { sector: "Real Estate", percentage: 25 },
        { sector: "Healthcare", percentage: 20 },
        { sector: "Small Business", percentage: 20 }
      ]
    });
  });

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // 2. CATCH-ALL (This must stay at the very bottom)
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.NODE_ENV === "production" ? 3000 : 5000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);