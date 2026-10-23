// CI only. Vercel builds from source using the real public database catalogue.
import fs from "node:fs";
import { SHOP_SEED_PRODUCTS } from "../shared/shopCatalog.ts";
if (!process.argv[2]) throw new Error("Fixture output file required");
fs.writeFileSync(
  process.argv[2],
  JSON.stringify({ products: SHOP_SEED_PRODUCTS })
);
