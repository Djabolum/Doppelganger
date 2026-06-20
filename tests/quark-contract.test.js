const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

test("V1.1 freeze keeps Quark transport unimplemented", () => {
  const freeze = fs.readFileSync(path.join(ROOT, "docs/v1.1-freeze.md"), "utf8");
  assert.match(freeze, /Doppelganger V1\.1 — Frozen/);
  assert.match(freeze, /no implementation before specification approval/i);

  const adapterFiles = fs.readdirSync(path.join(ROOT, "packages/adapters/quark"));
  assert.deepEqual(adapterFiles, ["README.md"]);
});

test("Quark intake candidate accepts only bounded payload kinds", () => {
  const schema = readJson("schemas/continuity_deposit.schema.json");
  assert.deepEqual(schema.properties.payload_kind.enum, ["handoff_card", "fossil_trace"]);
  assert.equal(schema.properties.retention_requested_days.minimum, 1);
  assert.equal(schema.properties.retention_requested_days.maximum, 30);
  assert.equal(schema.properties.projection.properties.artifact_size_bytes.maximum, 16384);

  const policy = schema.properties.policy.properties;
  for (const field of [
    "authority",
    "memory_authority",
    "decision_authority",
    "activation_allowed",
    "raw_conversation_included",
    "fossil_derivation_allowed",
    "semantic_indexing_allowed",
  ]) {
    assert.equal(policy[field].const, false, `${field} must remain false`);
  }
  assert.equal(policy.revocable.const, true);
  assert.equal(policy.user_approved_projection_included.const, true);
  assert.equal(Object.hasOwn(policy, "authored_projection_included"), false);
});

test("Quark intake 0.3 is deny-by-default with scoped credential lifecycle", () => {
  const contract = fs.readFileSync(
    path.join(ROOT, "docs/quark-intake-contract-v0.3.md"),
    "utf8"
  );
  assert.match(contract, /Positive capability boundary/);
  assert.match(contract, /Any operation not explicitly listed above is forbidden in V2\.0/);
  assert.match(contract, /No implicit capability/);
  const normalizedContract = contract.replace(/^>\s?/gm, "").replace(/\s+/g, " ");
  assert.ok(
    normalizedContract.includes(
      "A deposit grants quarantine only. Any later read, promotion, indexing, " +
        "fossil derivation, or memory operation requires a new contract, a new " +
        "consent event, and a new receipt."
    ),
    "canonical quarantine-only capability rule must remain exact"
  );
  assert.match(contract, /Backup copies are unavailable to application\s+reads/);
  assert.match(contract, /default TTL: 24 hours/);
  assert.match(contract, /maximum TTL: 7 days/);
  for (const scope of [
    "continuity:intake:create",
    "continuity:intake:read_status",
    "continuity:intake:delete",
  ]) {
    assert.match(contract, new RegExp(scope));
  }
  assert.match(contract, /V2\.0 consent must not be reused as read consent/);
  assert.match(contract, /projection_read_not_supported/);
  assert.match(contract, /16 KiB \(16,384 bytes\)/);
  assert.match(contract, /Backup encryption keys must not be accessible to application request\s+handlers/);
  assert.match(contract, /backup copies containing projection content must expire no later\s+than 30 days/i);

  const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.doppelganger\/$/m);
});

test("Quark contract examples preserve hash and non-capture invariants", () => {
  const deposit = readJson("examples/quark_deposit/continuity_deposit.json");
  const receipt = readJson("examples/quark_deposit/continuity_deposit_receipt.json");
  const status = readJson("examples/quark_deposit/continuity_status.json");
  const deletion = readJson("examples/quark_deposit/continuity_deletion_receipt.json");
  const expiry = readJson("examples/quark_deposit/continuity_expiry_receipt.json");

  assert.equal(sha256(deposit.projection.artifact), deposit.projection.content_hash);
  assert.equal(
    Buffer.byteLength(canonicalJson(deposit.projection.artifact), "utf8"),
    deposit.projection.artifact_size_bytes
  );
  assert.ok(deposit.projection.artifact_size_bytes <= 16384);
  assert.equal(deposit.consent.projection_hash, deposit.projection.content_hash);
  assert.equal(sha256(deposit.policy), receipt.server_receipt.policy_hash);
  assert.equal(receipt.server_receipt.content_hash, deposit.projection.content_hash);
  assert.equal(status.content_hash, deposit.projection.content_hash);
  assert.equal(deletion.content_hash, deposit.projection.content_hash);
  assert.equal(expiry.content_hash, deposit.projection.content_hash);

  assert.equal(deposit.schema_version, "0.3");
  assert.equal(deposit.policy.user_approved_projection_included, true);
  assert.equal(Object.hasOwn(deposit.policy, "authored_projection_included"), false);
  assert.equal(receipt.state, "quarantined");
  assert.equal(receipt.server_receipt.fossil_created, false);
  assert.equal(receipt.server_receipt.activated, false);
  assert.equal(receipt.server_receipt.indexed, false);
  assert.equal(receipt.retention.mode, "bounded");
  assert.equal(Object.hasOwn(status, "projection"), false);
  assert.equal(Object.hasOwn(status, "artifact"), false);
  assert.equal(deletion.projection_retained, false);
  assert.equal(deletion.backup_projection_max_retention_days, 30);
  assert.equal(expiry.projection_retained, false);
  assert.equal(expiry.backup_projection_max_retention_days, 30);
});
