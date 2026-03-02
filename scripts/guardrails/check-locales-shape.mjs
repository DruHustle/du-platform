import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const localesDir = path.join(rootDir, "frontend", "public", "locales");

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function flattenObjectTypes(input, prefix = "", out = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const key of Object.keys(input)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const current = input[key];
    out[fullKey] = valueType(current);
    if (current && typeof current === "object" && !Array.isArray(current)) {
      flattenObjectTypes(current, fullKey, out);
    }
  }
  return out;
}

function fail(message) {
  console.error(`[guardrails:locales] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(localesDir)) {
  fail(`Missing locales directory: ${localesDir}`);
}

const localeCodes = fs
  .readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!localeCodes.includes("en")) {
  fail("Missing required baseline locale: frontend/public/locales/en/translation.json");
}

const localeObjects = {};
for (const locale of localeCodes) {
  const filePath = path.join(localesDir, locale, "translation.json");
  if (!fs.existsSync(filePath)) continue;
  try {
    localeObjects[locale] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON at ${filePath}: ${error.message}`);
  }
}

if (!localeObjects.en || typeof localeObjects.en !== "object" || Array.isArray(localeObjects.en)) {
  fail("English translation baseline must be a JSON object.");
}

const baselineMap = flattenObjectTypes(localeObjects.en);
const problems = [];

for (const [locale, translations] of Object.entries(localeObjects)) {
  if (locale === "en") continue;
  const localeMap = flattenObjectTypes(translations);

  for (const [key, enType] of Object.entries(baselineMap)) {
    if (!(key in localeMap)) continue;
    const localeType = localeMap[key];
    if (localeType !== enType) {
      problems.push(`${locale}: key "${key}" type mismatch (en=${enType}, ${locale}=${localeType})`);
      if (problems.length >= 100) break;
    }
  }

  if (problems.length >= 100) break;
}

if (problems.length > 0) {
  fail(`Found locale shape mismatches:\n- ${problems.join("\n- ")}`);
}

console.log(`[guardrails:locales] OK (${Object.keys(localeObjects).length} locale files checked)`);
