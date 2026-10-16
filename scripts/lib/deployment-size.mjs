import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const deploymentLimits = {
  totalBytes: 60 * 1024 ** 2,
  fileBytes: 6 * 1024 ** 2,
};

export async function verifyDeploymentSize(root, limits = deploymentLimits) {
  const files = [];
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      const relative = path.relative(root, filename);
      assert(
        !entry.isSymbolicLink(),
        `Deployment output must not contain symlinks: ${relative}`
      );
      assert(
        !/^(?:\.env(?:\.|$)|private$|node_modules$|du-platform-backend$)/i.test(
          entry.name
        ),
        `Non-public file in deployment output: ${relative}`
      );
      if (entry.isDirectory()) await inspect(filename);
      else files.push({ path: relative, bytes: (await stat(filename)).size });
    }
  }
  await inspect(root);
  assert(
    files.length > 0,
    "Build the frontend before checking deployment size"
  );
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const largest = files.toSorted((a, b) => b.bytes - a.bytes);
  assert(
    largest[0].bytes <= limits.fileBytes,
    `Oversized deployment file: ${largest[0].path} (${largest[0].bytes} bytes; limit ${limits.fileBytes})`
  );
  assert(
    totalBytes <= limits.totalBytes,
    `Deployment output is ${totalBytes} bytes; limit ${limits.totalBytes}. Remove unused assets or optimize the largest files.`
  );
  return { totalBytes, fileCount: files.length, largest: largest.slice(0, 5) };
}
