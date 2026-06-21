const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const DOCTOR = path.join(ROOT, "scripts/quark-contract-doctor.js");

function runDoctor(args = [], cwd = ROOT) {
  return spawnSync(process.execPath, [DOCTOR, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("contract doctor reports the healthy producer contract in text and JSON", () => {
  const text = runDoctor();
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /Role: producer/);
  assert.match(text.stdout, /Status: healthy/);
  assert.match(text.stdout, /Fixture version: candidate-0\.3-v0/);
  assert.match(text.stdout, /Payload schema: 0\.3/);
  assert.match(text.stdout, /Artifact size: 408 bytes/);
  assert.match(text.stdout, /Network authorized: false/);

  const jsonResult = runDoctor(["--json"]);
  assert.equal(jsonResult.status, 0, jsonResult.stderr);
  const report = JSON.parse(jsonResult.stdout);
  assert.equal(report.kind, "continuity_contract_doctor_report");
  assert.equal(report.role, "producer");
  assert.equal(report.status, "healthy");
  assert.equal(
    report.contract_id,
    "sha256:6f1418e508abbd4e4d4329ef20a6ba6bc972dc0dbca132b299136106291545d9"
  );
  assert.equal(report.fixture_version, "candidate-0.3-v0");
  assert.equal(report.manifest_schema_version, "0.1");
  assert.equal(report.payload_schema_version, "0.3");
  assert.equal(report.artifact_size_bytes, 408);
  assert.equal(report.network_authorized, false);
  assert.deepEqual(report.checks, {
    payload_hash: true,
    artifact_size: true,
    contract_lock: true,
    network_authorized: true,
  });
});

test("contract doctor reports drift with a non-zero exit and writes nothing", (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-doctor-drift-"));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  for (const relative of [
    "scripts/quark-contract-doctor.js",
    "scripts/lib/quark-contract.js",
    "examples/quark_deposit/continuity_deposit.json",
    "schemas/continuity_deposit.schema.json",
    "contracts/quark/continuity_contract_lock.json",
  ]) {
    const destination = path.join(sandbox, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relative), destination);
  }

  const lockPath = path.join(
    sandbox,
    "contracts",
    "quark",
    "continuity_contract_lock.json"
  );
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.contract_id = "sha256:" + "0".repeat(64);
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [path.join(sandbox, "scripts", "quark-contract-doctor.js"), "--json"],
    { cwd: sandbox, encoding: "utf8" }
  );
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "drift");
  assert.equal(report.checks.contract_lock, false);
  assert.deepEqual(
    fs.readdirSync(sandbox).sort(),
    ["contracts", "examples", "schemas", "scripts"]
  );
});

test("contract doctor contains no network client dependency", () => {
  const source = [
    fs.readFileSync(DOCTOR, "utf8"),
    fs.readFileSync(path.join(ROOT, "scripts/lib/quark-contract.js"), "utf8"),
  ].join("\n");
  for (const forbidden of [
    "node:http",
    "node:https",
    "node:net",
    "node:child_process",
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden));
  }
});
