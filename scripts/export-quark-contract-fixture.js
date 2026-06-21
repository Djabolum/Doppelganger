#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  LOCK_FILE,
  MANIFEST_FILE,
  PAYLOAD_FILE,
  inspectContract,
} = require("./lib/quark-contract");

function fail(message) {
  process.stderr.write(`export-quark-contract-fixture: ${message}\n`);
  process.exit(1);
}

function parseOutputDirectory(argv) {
  if (argv.length !== 2 || argv[0] !== "--output" || !argv[1]) {
    fail("usage: npm run export:quark-contract-fixture -- --output <directory>");
  }
  return path.resolve(argv[1]);
}

function main() {
  const outputDirectory = parseOutputDirectory(process.argv.slice(2));
  let report;
  try {
    report = inspectContract();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (!report.healthy) {
    fail(
      `contract drift detected: computed ${report.manifest.contract_id}, ` +
        `locked ${report.lock.contract_id}. Bump the fixture version and update both repositories explicitly.`
    );
  }

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, PAYLOAD_FILE), report.payloadBytes, {
    mode: 0o644,
  });
  fs.writeFileSync(
    path.join(outputDirectory, MANIFEST_FILE),
    `${JSON.stringify(report.manifest, null, 2)}\n`,
    { mode: 0o644 }
  );
  fs.writeFileSync(
    path.join(outputDirectory, LOCK_FILE),
    `${JSON.stringify(report.lock, null, 2)}\n`,
    { mode: 0o644 }
  );

  process.stdout.write(
    `Exported ${PAYLOAD_FILE}, ${MANIFEST_FILE}, and ${LOCK_FILE} to ${outputDirectory}\n`
  );
  process.stdout.write("Local contract fixture only — network_authorized=false\n");
}

main();
