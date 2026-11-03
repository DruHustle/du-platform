// Local-only combined host for browser tests. Production runs web and API separately.
import path from "node:path";
import { createServer } from "node:http";
import { initializeDatabase } from "../../../../du-platform-backend/db";
import { db, isMemoryFallbackEnabled } from "../../../../du-platform-backend/shared/databaseRuntime";
import { createModularServer } from "../lib/browser-test-server";

const port = Number(process.env.PORT || 5012);
if (!Number.isInteger(port) || port < 1025 || port > 65535) throw new Error("Invalid test port");
try { await initializeDatabase(); } catch (error) { if (!isMemoryFallbackEnabled()) throw error; }
const app = createModularServer({ backend: { db, serverStartedAt: Date.now() }, staticPath: path.resolve("du-platform-frontend/web/dist") });
const server = createServer(app);
server.listen(port, "127.0.0.1", () => console.log(`Browser fixture listening on ${port}`));
process.on("SIGTERM", () => server.close(() => {
  if (db) void db.end().finally(() => process.exit(0));
  else process.exit(0);
}));
