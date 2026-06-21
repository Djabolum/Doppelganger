#!/usr/bin/env node
"use strict";

const { inspectContract } = require("./lib/quark-contract");

function reportJson(report) {
  return {
    schema_version: "0.1",
    kind: "continuity_contract_doctor_report",
    role: "producer",
    status: report.healthy ? "healthy" : "drift",
    contract_id: report.manifest.contract_id,
    fixture_version: report.manifest.fixture_version,
    manifest_schema_version: report.manifest.schema_version,
    payload_schema_version: report.payload.schema_version,
    payload_sha256: report.manifest.payload_sha256,
    canonical_artifact_hash: report.manifest.canonical_artifact_hash,
    artifact_size_bytes: report.manifest.artifact_size_bytes,
    network_authorized: false,
    checks: report.checks,
  };
}

function renderText(report) {
  const data = reportJson(report);
  const lines = [
    "Continuity Contract Doctor",
    "",
    `Role: ${data.role}`,
    `Status: ${data.status}`,
    `Contract ID: ${data.contract_id}`,
    `Fixture version: ${data.fixture_version}`,
    `Manifest schema: ${data.manifest_schema_version}`,
    `Payload schema: ${data.payload_schema_version}`,
    `Payload SHA-256: ${data.payload_sha256}`,
    `Artifact hash: ${data.canonical_artifact_hash}`,
    `Artifact size: ${data.artifact_size_bytes} bytes`,
    `Network authorized: ${data.network_authorized}`,
    "",
  ];
  for (const [name, ok] of Object.entries(data.checks)) {
    lines.push(`[${ok ? "OK" : "DRIFT"}] ${name}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== "--json")) {
    process.stderr.write(
      "quark-contract-doctor: usage: npm run contract:doctor -- [--json]\n"
    );
    process.exit(1);
  }

  let report;
  try {
    report = inspectContract();
  } catch (error) {
    process.stderr.write(
      `quark-contract-doctor: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
  const output = argv[0] === "--json"
    ? `${JSON.stringify(reportJson(report), null, 2)}\n`
    : renderText(report);
  process.stdout.write(output);
  process.exitCode = report.healthy ? 0 : 1;
}

main();
