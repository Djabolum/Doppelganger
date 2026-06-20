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
});

test("Quark contract examples preserve hash and non-capture invariants", () => {
  const deposit = readJson("examples/quark_deposit/continuity_deposit.json");
  const receipt = readJson("examples/quark_deposit/continuity_deposit_receipt.json");
  const deletion = readJson("examples/quark_deposit/continuity_deletion_receipt.json");

  assert.equal(sha256(deposit.projection.artifact), deposit.projection.content_hash);
  assert.equal(deposit.consent.projection_hash, deposit.projection.content_hash);
  assert.equal(sha256(deposit.policy), receipt.server_receipt.policy_hash);
  assert.equal(receipt.server_receipt.content_hash, deposit.projection.content_hash);
  assert.equal(deletion.content_hash, deposit.projection.content_hash);

  assert.equal(receipt.state, "quarantined");
  assert.equal(receipt.server_receipt.fossil_created, false);
  assert.equal(receipt.server_receipt.activated, false);
  assert.equal(receipt.server_receipt.indexed, false);
  assert.equal(receipt.retention.mode, "bounded");
  assert.equal(deletion.projection_retained, false);
});
