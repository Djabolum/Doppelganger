const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_ROOTS = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "docs",
  "examples",
  "packages/adapters",
  "packages/browser-extension",
];

const TEXT_EXTENSIONS = new Set([".md", ".json", ".txt"]);
const FORBIDDEN = [
  { label: "private /opt path", pattern: /\/opt\//i },
  { label: "private home path", pattern: /\/home\/ubuntu/i },
  { label: "private storage path", pattern: /\/mnt\/ssd/i },
  { label: "loopback address", pattern: /\b127\.0\.0\.1\b/i },
  { label: "private deployment domain", pattern: /\b(?:api\.|supervision\.)?cordee\.ovh\b/i },
  { label: "private host name", pattern: /\bjabbolum\b/i },
  { label: "internal service name", pattern: /\b(?:CortexHub|Elyndra|Zarith|state-guard|supervision-api)\b/i },
  { label: "process manager detail", pattern: /\bPM2\b/i },
  { label: "operator infrastructure wording", pattern: /\bVPS\b/i },
  { label: "localhost port", pattern: /\blocalhost:\d+\b/i },
];

function collect(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(full, entry.name);
    if (entry.isDirectory()) return collect(path.relative(ROOT, child));
    return TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [child] : [];
  });
}

test("public documentation contains no known private deployment details", () => {
  const findings = [];
  for (const file of PUBLIC_ROOTS.flatMap(collect)) {
    const content = fs.readFileSync(file, "utf8");
    for (const rule of FORBIDDEN) {
      if (rule.pattern.test(content)) {
        findings.push(`${path.relative(ROOT, file)}: ${rule.label}`);
      }
    }
  }
  assert.deepEqual(findings, []);
});
