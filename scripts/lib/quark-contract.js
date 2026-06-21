"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_PATH = "examples/quark_deposit/continuity_deposit.json";
const SCHEMA_PATH = "schemas/continuity_deposit.schema.json";
const LOCK_PATH = "contracts/quark/continuity_contract_lock.json";
const PAYLOAD_FILE = "continuity_deposit_candidate_0.3.json";
const MANIFEST_FILE = "continuity_contract_fixture_manifest.json";
const LOCK_FILE = "continuity_contract_lock.json";

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
  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new Error("floating-point values are not supported in contract fixtures");
  }
  return JSON.stringify(value);
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256Prefixed(value) {
  return `sha256:${sha256Hex(Buffer.from(canonicalJson(value), "utf8"))}`;
}

function contractIdentity(manifest) {
  return {
    schema_version: manifest.schema_version,
    fixture_version: manifest.fixture_version,
    producer: manifest.producer,
    payload_sha256: manifest.payload_sha256,
    canonical_artifact_hash: manifest.canonical_artifact_hash,
    artifact_size_bytes: manifest.artifact_size_bytes,
    contract_surface: manifest.contract_surface,
    expected_receipt: manifest.expected_receipt,
    network_authorized: manifest.network_authorized,
  };
}

function requiredFields(schema) {
  return [...schema.required].sort();
}

function constMap(schema) {
  return Object.fromEntries(
    Object.entries(schema.properties)
      .filter(([, definition]) => Object.hasOwn(definition, "const"))
      .map(([name, definition]) => [name, definition.const])
  );
}

function contractSurface(schema) {
  const properties = schema.properties;
  return {
    request_required_fields: requiredFields(schema),
    request_additional_properties: schema.additionalProperties,
    request_constants: Object.fromEntries(
      ["schema_version", "kind", "source"].map((name) => [
        name,
        properties[name].const,
      ])
    ),
    payload_kinds: [...properties.payload_kind.enum].sort(),
    projection_required_fields: requiredFields(properties.projection),
    projection_additional_properties:
      properties.projection.additionalProperties,
    artifact_size_bytes: {
      minimum: properties.projection.properties.artifact_size_bytes.minimum,
      maximum: properties.projection.properties.artifact_size_bytes.maximum,
    },
    policy_required_fields: requiredFields(properties.policy),
    policy_additional_properties: properties.policy.additionalProperties,
    policy_constants: constMap(properties.policy),
    consent_required_fields: requiredFields(properties.consent),
    consent_additional_properties: properties.consent.additionalProperties,
    consent_mode: properties.consent.properties.mode.const,
    receipt_policy_required_fields: requiredFields(properties.receipt_policy),
    receipt_policy_additional_properties:
      properties.receipt_policy.additionalProperties,
    receipt_policy_constants: constMap(properties.receipt_policy),
    retention_requested_days: {
      minimum: properties.retention_requested_days.minimum,
      maximum: properties.retention_requested_days.maximum,
    },
  };
}

function contractId(manifest) {
  return sha256Prefixed(contractIdentity(manifest));
}

function inspectContract(root = ROOT) {
  const payload = JSON.parse(
    fs.readFileSync(path.join(root, SOURCE_PATH), "utf8")
  );
  const schema = JSON.parse(
    fs.readFileSync(path.join(root, SCHEMA_PATH), "utf8")
  );
  const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), "utf8"));
  const artifact = payload?.projection?.artifact;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new Error("source payload does not contain a projection artifact");
  }

  const canonicalArtifact = Buffer.from(canonicalJson(artifact), "utf8");
  const contentHash = sha256Prefixed(artifact);
  const payloadBytes = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const manifest = {
    schema_version: "0.1",
    kind: "continuity_contract_fixture_manifest",
    fixture_version: "candidate-0.3-v0",
    producer: "doppelganger",
    source_path: SOURCE_PATH,
    payload_file: PAYLOAD_FILE,
    payload_sha256: `sha256:${sha256Hex(payloadBytes)}`,
    canonical_artifact_hash: contentHash,
    artifact_size_bytes: canonicalArtifact.length,
    contract_surface: contractSurface(schema),
    expected_receipt: {
      schema_version: "0.3",
      kind: "continuity_deposit_receipt",
      state: "quarantined",
      stored_as: "continuity_quarantine",
      top_level_fields: [
        "kind",
        "quark_deposit_id",
        "retention",
        "schema_version",
        "server_receipt",
        "state",
        "stored_as",
      ],
      server_receipt_fields: [
        "activated",
        "content_hash",
        "fossil_created",
        "id",
        "indexed",
        "payload_kind",
        "policy_hash",
        "received_at",
      ],
    },
    network_authorized: false,
  };
  manifest.contract_id = contractId(manifest);

  const checks = {
    payload_hash:
      payload.projection.content_hash === contentHash &&
      payload.consent?.projection_hash === contentHash,
    artifact_size:
      payload.projection.artifact_size_bytes === canonicalArtifact.length,
    contract_lock:
      lock.kind === "cross_repo_contract_lock" &&
      lock.contract_name === "doppelganger-quark-continuity" &&
      lock.fixture_version === manifest.fixture_version &&
      lock.contract_id === manifest.contract_id &&
      lock.network_authorized === false,
    network_authorized:
      manifest.network_authorized === false && lock.network_authorized === false,
  };

  return {
    healthy: Object.values(checks).every(Boolean),
    checks,
    payload,
    payloadBytes,
    schema,
    lock,
    manifest,
  };
}

module.exports = {
  LOCK_FILE,
  MANIFEST_FILE,
  PAYLOAD_FILE,
  canonicalJson,
  contractId,
  contractIdentity,
  inspectContract,
};
