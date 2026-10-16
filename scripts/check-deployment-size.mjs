import path from "node:path";
import { verifyDeploymentSize } from "./lib/deployment-size.mjs";

const report = await verifyDeploymentSize(
  path.resolve(process.argv[2] || "dist/public")
);
console.log(
  `[deployment-size] ${(report.totalBytes / 1024 ** 2).toFixed(2)} MiB in ${report.fileCount} files; within the 60 MiB output and 6 MiB per-file budgets`
);
