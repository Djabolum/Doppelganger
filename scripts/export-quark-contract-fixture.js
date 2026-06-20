#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = "examples/quark_deposit/continuity_deposit.json";
const PAYLOAD_FILE = "continuity_deposit_candidate_0.3.json";
const MANIFEST_FILE = "continuity_contract_fixture_manifest.json";

function fail(message) {
  process.stderr.write(`export-quark-contract-fixture: ${message}\n`);
  process.exit(1);
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
  if (typeof value === "number" && !Number.isInteger(value)) {
    fail("floating-point values are not supported in contract fixtures");
  }
  return JSON.stringify(value);
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256Prefixed(value) {
  return `sha256:${sha256Hex(Buffer.from(canonicalJson(value), "utf8"))}`;
}

function parseOutputDirectory(argv) {
  if (argv.length !== 2 || argv[0] !== "--output" || !argv[1]) {
    fail("usage: npm run export:quark-contract-fixture -- --output <directory>");
  }
  return path.resolve(argv[1]);
}

function main() {
  const outputDirectory = parseOutputDirectory(process.argv.slice(2));
  const sourceFile = path.join(ROOT, SOURCE_PATH);
  const payload = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const artifact = payload?.projection?.artifact;

  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    fail("source payload does not contain a projection artifact");
  }

  const canonicalArtifact = Buffer.from(canonicalJson(artifact), "utf8");
  const contentHash = sha256Prefixed(artifact);
  if (payload.projection.content_hash !== contentHash) {
    fail("source payload content_hash does not match the canonical artifact");
  }
  if (payload.consent?.projection_hash !== contentHash) {
    fail("source payload consent hash does not match the canonical artifact");
  }
  if (payload.projection.artifact_size_bytes !== canonicalArtifact.length) {
    fail("source payload artifact_size_bytes does not match canonical UTF-8 bytes");
  }

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
        "stored_as"
      ],
      server_receipt_fields: [
        "activated",
        "content_hash",
        "fossil_created",
        "id",
        "indexed",
        "payload_kind",
        "policy_hash",
        "received_at"
      ]
    },
    network_authorized: false
  };

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, PAYLOAD_FILE), payloadBytes, {
    mode: 0o644
  });
  fs.writeFileSync(
    path.join(outputDirectory, MANIFEST_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o644 }
  );

  process.stdout.write(
    `Exported ${PAYLOAD_FILE} and ${MANIFEST_FILE} to ${outputDirectory}\n`
  );
  process.stdout.write("Local contract fixture only — network_authorized=false\n");
}

main();
