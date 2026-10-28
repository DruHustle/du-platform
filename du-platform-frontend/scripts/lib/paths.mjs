import path from "node:path";

export const frontendDir = path.resolve(import.meta.dirname, "../..");
export const repoDir = path.resolve(frontendDir, "..");
export const outputDir = path.join(frontendDir, "dist");
