import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { verifyDeploymentSize } from "../lib/deployment-size.mjs";

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), "du-deployment-size-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("measures nested public output and reports the largest assets", () =>
  fixture(async root => {
    await mkdir(path.join(root, "images"));
    await writeFile(path.join(root, "index.html"), "page");
    await writeFile(path.join(root, "images/photo.jpg"), "photo-content");
    const result = await verifyDeploymentSize(root);
    assert.equal(result.totalBytes, 17);
    assert.equal(result.fileCount, 2);
    assert.equal(result.largest[0].path, "images/photo.jpg");
  }));

test("rejects an oversized panorama before it is published", () =>
  fixture(async root => {
    await writeFile(path.join(root, "panorama.jpg"), "large-image");
    await assert.rejects(
      verifyDeploymentSize(root, { fileBytes: 10, totalBytes: 100 }),
      /Oversized deployment file: panorama.jpg/
    );
  }));

test("rejects accumulated deployment growth even when individual files are small", () =>
  fixture(async root => {
    await writeFile(path.join(root, "one.jpg"), "123456");
    await writeFile(path.join(root, "two.jpg"), "123456");
    await assert.rejects(
      verifyDeploymentSize(root, { fileBytes: 10, totalBytes: 10 }),
      /Deployment output is 12 bytes/
    );
  }));

test("rejects accidentally published private environment files", () =>
  fixture(async root => {
    await writeFile(path.join(root, ".env.production"), "EXAMPLE=value");
    await assert.rejects(
      verifyDeploymentSize(root),
      /Non-public file in deployment output/
    );
  }));
