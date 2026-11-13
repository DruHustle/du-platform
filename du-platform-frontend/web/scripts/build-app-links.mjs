import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const packageName = "com.diasporaunlocked.app";

export async function writeAppLinks(output, env) {
  const directory = path.join(output, ".well-known");
  const apple = path.join(directory, "apple-app-site-association");
  const android = path.join(directory, "assetlinks.json");
  const prefix = env.IOS_APP_ID_PREFIX?.trim();
  const fingerprintList = env.PLAY_APP_SIGNING_CERT_SHA256?.trim();

  if (prefix && !/^[A-Z0-9]{10}$/.test(prefix)) {
    throw new Error("IOS_APP_ID_PREFIX must be the application identifier prefix in the distribution entitlement.");
  }
  const fingerprints = fingerprintList
    ? fingerprintList.split(",").map(value => value.trim().toUpperCase())
    : [];
  for (const fingerprint of fingerprints) {
    if (!/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint)) {
      throw new Error("PLAY_APP_SIGNING_CERT_SHA256 requires colon-separated SHA-256 fingerprints from Play App Signing.");
    }
  }

  const iosDocument = prefix && {
    applinks: {
      details: [{
        appIDs: [prefix + "." + packageName],
        components: ["/reset-password", "/shop", "/shop/*", "/travel", "/travel/*"].map(route => ({ "/": route })),
      }],
    },
  };
  const androidDocument = fingerprints.length > 0 && [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [...new Set(fingerprints)],
    },
  }];
  await mkdir(directory, { recursive: true });
  for (const [file, contents] of [[apple, iosDocument], [android, androidDocument]]) {
    if (contents) await writeFile(file, JSON.stringify(contents, null, 2) + "\n");
    else await rm(file, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeAppLinks(path.resolve("dist"), process.env);
}
