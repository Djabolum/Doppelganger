const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts/export-quark-contract-fixture.js");

function runExport(outputDirectory) {
  return spawnSync(process.execPath, [SCRIPT, "--output", outputDirectory], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

test("Quark contract fixture export is deterministic and network-disabled", (t) => {
  const scriptSource = fs.readFileSync(SCRIPT, "utf8");
  for (const forbiddenModule of [
    "node:http",
    "node:https",
    "node:net",
    "node:socket",
    "node:child_process",
  ]) {
    assert.doesNotMatch(scriptSource, new RegExp(forbiddenModule));
  }

  const first = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-contract-first-"));
  const second = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-contract-second-"));
  t.after(() => fs.rmSync(first, { recursive: true, force: true }));
  t.after(() => fs.rmSync(second, { recursive: true, force: true }));

  const firstResult = runExport(first);
  const secondResult = runExport(second);
  assert.equal(firstResult.status, 0, firstResult.stderr);
  assert.equal(secondResult.status, 0, secondResult.stderr);
  assert.match(firstResult.stdout, /network_authorized=false/);

  const payloadName = "continuity_deposit_candidate_0.3.json";
  const manifestName = "continuity_contract_fixture_manifest.json";
  const lockName = "continuity_contract_lock.json";
  const firstPayload = fs.readFileSync(path.join(first, payloadName));
  const secondPayload = fs.readFileSync(path.join(second, payloadName));
  const firstManifest = fs.readFileSync(path.join(first, manifestName));
  const secondManifest = fs.readFileSync(path.join(second, manifestName));
  const firstLock = fs.readFileSync(path.join(first, lockName));
  const secondLock = fs.readFileSync(path.join(second, lockName));

  assert.deepEqual(firstPayload, secondPayload);
  assert.deepEqual(firstManifest, secondManifest);
  assert.deepEqual(firstLock, secondLock);

  const sourcePayload = fs.readFileSync(
    path.join(ROOT, "examples/quark_deposit/continuity_deposit.json")
  );
  assert.deepEqual(firstPayload, sourcePayload);

  const manifest = JSON.parse(firstManifest);
  const lock = JSON.parse(firstLock);
  assert.equal(manifest.kind, "continuity_contract_fixture_manifest");
  assert.equal(manifest.fixture_version, "candidate-0.3-v0");
  assert.equal(manifest.network_authorized, false);
  assert.equal(manifest.contract_id, lock.contract_id);
  assert.equal(lock.kind, "cross_repo_contract_lock");
  assert.equal(lock.contract_name, "doppelganger-quark-continuity");
  assert.equal(lock.fixture_version, manifest.fixture_version);
  assert.equal(lock.network_authorized, false);
  assert.equal(
    manifest.payload_sha256,
    `sha256:${crypto.createHash("sha256").update(firstPayload).digest("hex")}`
  );
  assert.equal(
    manifest.canonical_artifact_hash,
    "sha256:299405503880d924e81fafbf0b0afa3aa72cd75de5b16e87d2dcedd5d99b76d0"
  );
  assert.equal(manifest.artifact_size_bytes, 408);
});

test("Quark contract fixture export fails closed on unversioned drift", (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-contract-drift-"));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const sandboxScript = path.join(sandbox, "scripts", path.basename(SCRIPT));
  const sandboxExample = path.join(
    sandbox,
    "examples",
    "quark_deposit",
    "continuity_deposit.json"
  );
  const sandboxLock = path.join(
    sandbox,
    "contracts",
    "quark",
    "continuity_contract_lock.json"
  );
  fs.mkdirSync(path.dirname(sandboxScript), { recursive: true });
  fs.mkdirSync(path.dirname(sandboxExample), { recursive: true });
  fs.mkdirSync(path.dirname(sandboxLock), { recursive: true });
  fs.copyFileSync(SCRIPT, sandboxScript);
  fs.copyFileSync(
    path.join(ROOT, "examples/quark_deposit/continuity_deposit.json"),
    sandboxExample
  );
  const sandboxSchema = path.join(
    sandbox,
    "schemas",
    "continuity_deposit.schema.json"
  );
  fs.mkdirSync(path.dirname(sandboxSchema), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "schemas/continuity_deposit.schema.json"),
    sandboxSchema
  );
  fs.copyFileSync(
    path.join(ROOT, "contracts/quark/continuity_contract_lock.json"),
    sandboxLock
  );

  const changed = JSON.parse(fs.readFileSync(sandboxExample, "utf8"));
  changed.retention_requested_days = 29;
  fs.writeFileSync(sandboxExample, `${JSON.stringify(changed, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [sandboxScript, "--output", path.join(sandbox, "out")],
    { cwd: sandbox, encoding: "utf8" }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contract drift detected/);
  assert.equal(fs.existsSync(path.join(sandbox, "out")), false);
});

test("Quark contract fixture export rejects unversioned schema drift", (t) => {
  const sandbox = fs.mkdtempSync(
    path.join(os.tmpdir(), "doppel-contract-schema-drift-")
  );
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  for (const relative of [
    "scripts/export-quark-contract-fixture.js",
    "examples/quark_deposit/continuity_deposit.json",
    "schemas/continuity_deposit.schema.json",
    "contracts/quark/continuity_contract_lock.json",
  ]) {
    const destination = path.join(sandbox, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relative), destination);
  }

  const schemaPath = path.join(
    sandbox,
    "schemas",
    "continuity_deposit.schema.json"
  );
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  schema.properties.retention_requested_days.maximum = 31;
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [
      path.join(sandbox, "scripts", "export-quark-contract-fixture.js"),
      "--output",
      path.join(sandbox, "out"),
    ],
    { cwd: sandbox, encoding: "utf8" }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contract drift detected/);
  assert.equal(fs.existsSync(path.join(sandbox, "out")), false);
});

test("Quark contract fixture export requires an explicit output directory", () => {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--output <directory>/);
});
