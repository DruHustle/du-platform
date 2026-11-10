import fs from "node:fs";

const filename = process.argv[2];
let report;
try {
  report = JSON.parse(fs.readFileSync(filename, "utf8"));
} catch {
  const message = "## Mobile dependency audit\n\nThe audit did not produce a readable report. Security verification remains incomplete.\n";
  console.error(message);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (report.error || !counts) {
  const message = "## Mobile dependency audit\n\nThe registry audit failed. Security verification remains incomplete; inspect the audit artifact and job output.\n";
  console.error(message);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
  process.exit(1);
}

const severities = ["critical", "high", "moderate", "low", "info"];
if (severities.some(severity => !Number.isInteger(counts[severity]) || counts[severity] < 0))
  throw new Error("The audit returned invalid vulnerability counts.");
const blocked = counts.critical + counts.high + counts.moderate > 0;
const message = [
  "## Mobile dependency audit",
  "",
  blocked
    ? "**Native distribution remains blocked by unresolved moderate-or-higher dependency findings.**"
    : "No moderate-or-higher findings were reported in the mobile application and development dependency graph.",
  "",
  "| Severity | Dependency entries |",
  "| --- | ---: |",
  ...severities.map(severity => `| ${severity} | ${counts[severity]} |`),
  "",
  "The complete npm audit report is retained as an artifact. Counts include dependencies affected transitively; they are not a count of distinct exploitable vulnerabilities in the installed application.",
  "",
  "Native compilation runs separately. A successful build does not resolve these findings or verify device workflows, signing, universal links or store readiness.",
  "",
].join("\n");
console.log(message);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
process.exitCode = blocked ? 1 : 0;
