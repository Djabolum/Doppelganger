const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);

test("public package metadata preserves the local-only release boundary", () => {
  assert.equal(packageJson.name, "@djabolum/doppelganger");
  assert.equal(packageJson.version, "0.1.1");
  assert.equal(packageJson.private, undefined);
  assert.deepEqual(packageJson.publishConfig, { access: "public" });
  assert.deepEqual(packageJson.bin, {
    doppel: "dist/packages/cli/index.js",
  });
  assert.equal(packageJson.scripts.prepack, "npm run build");
  assert.deepEqual(packageJson.files, [
    "dist/",
    "scripts/",
    "schemas/",
    "contracts/quark/",
    "examples/",
    "docs/",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
  ]);

  const description = packageJson.description.toLowerCase();
  assert.match(description, /local-first/);
  assert.match(description, /offline/);
  assert.doesNotMatch(description, /cloud|sync|live deposit|network transport/);
});

test("package whitelist contains runtime contract dependencies but no dev trees", () => {
  const files = new Set(packageJson.files);
  for (const required of [
    "dist/",
    "scripts/",
    "schemas/",
    "contracts/quark/",
    "examples/",
    "docs/",
  ]) {
    assert.equal(files.has(required), true, `${required} must be packed`);
  }
  for (const forbidden of [
    "packages/",
    "tests/",
    "node_modules/",
    ".doppelganger/",
    ".git/",
  ]) {
    assert.equal(files.has(forbidden), false, `${forbidden} must not be packed`);
  }

  const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(gitignore, /^\*\.tgz$/m);
});
