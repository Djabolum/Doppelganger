const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "dist/packages/cli/index.js");
const CONTRACT_ID =
  "sha256:6f1418e508abbd4e4d4329ef20a6ba6bc972dc0dbca132b299136106291545d9";

function workspace(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-candidate-"));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  return cwd;
}

function run(cwd, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    expectedStatus,
    `command: ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result;
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

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

test("candidate builder requires explicit confirmation and writes nothing otherwise", (t) => {
  const cwd = workspace(t);
  run(cwd, ["init"]);
  const created = run(cwd, [
    "handoff",
    "create",
    "--topic",
    "Bounded candidate",
    "--from",
    "chatgpt",
  ]);
  const id = JSON.parse(created.stdout).id;
  const out = path.join(cwd, "out", "candidate.json");
  const refused = run(
    cwd,
    [
      "contract",
      "build-quark-candidate",
      "--type",
      "handoff",
      "--id",
      id,
      "--out",
      out,
    ],
    1
  );
  assert.match(refused.stderr, /refusing local build without --confirm/);
  assert.equal(fs.existsSync(path.dirname(out)), false);
});

test("candidate builder emits a bounded handoff deposit and local-only manifest", (t) => {
  const cwd = workspace(t);
  run(cwd, ["init"]);
  const created = run(cwd, [
    "handoff",
    "create",
    "--topic",
    "Bounded candidate",
    "--from",
    "chatgpt",
    "--to",
    "quark",
    "--decision",
    "Preserve quarantine only",
    "--boundary",
    "Do not activate this projection",
  ]);
  const id = JSON.parse(created.stdout).id;
  const out = path.join(cwd, "out", "candidate.json");
  const result = run(cwd, [
    "contract",
    "build-quark-candidate",
    "--type",
    "handoff",
    "--id",
    id,
    "--out",
    out,
    "--confirm",
    "--retention-days",
    "14",
  ]);
  const manifestPath = path.join(cwd, "out", "candidate.manifest.json");
  const candidateBytes = fs.readFileSync(out);
  const candidate = JSON.parse(candidateBytes);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const canonicalArtifact = Buffer.from(
    canonicalJson(candidate.projection.artifact),
    "utf8"
  );

  assert.equal(candidate.schema_version, "0.3");
  assert.equal(candidate.payload_kind, "handoff_card");
  assert.equal(candidate.projection.artifact.id, id);
  assert.equal(candidate.projection.content_hash, sha256(canonicalArtifact));
  assert.equal(candidate.projection.artifact_size_bytes, canonicalArtifact.length);
  assert.equal(candidate.consent.mode, "explicit_cli_confirm");
  assert.equal(candidate.consent.projection_hash, candidate.projection.content_hash);
  assert.equal(candidate.retention_requested_days, 14);
  assert.deepEqual(candidate.policy, {
    authority: false,
    memory_authority: false,
    decision_authority: false,
    activation_allowed: false,
    raw_conversation_included: false,
    user_approved_projection_included: true,
    revocable: true,
    fossil_derivation_allowed: false,
    semantic_indexing_allowed: false,
  });
  assert.equal(manifest.kind, "quark_candidate_dry_run_manifest");
  assert.equal(manifest.contract_id, CONTRACT_ID);
  assert.equal(manifest.candidate_sha256, sha256(candidateBytes));
  assert.equal(manifest.artifact_content_hash, candidate.projection.content_hash);
  assert.equal(manifest.artifact_size_bytes, candidate.projection.artifact_size_bytes);
  assert.equal(manifest.network_authorized, false);
  assert.deepEqual(manifest.transport, {
    http_client_present: false,
    endpoint_configured: false,
    credential_included: false,
    sent: false,
  });
  const manifestSchema = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "schemas/quark_candidate_dry_run_manifest.schema.json"),
      "utf8"
    )
  );
  assert.deepEqual(Object.keys(manifest).sort(), manifestSchema.required.sort());
  assert.equal(
    manifestSchema.properties.contract_id.const,
    manifest.contract_id
  );
  assert.equal(
    manifestSchema.properties.network_authorized.const,
    manifest.network_authorized
  );
  assert.match(result.stdout, /No transport, endpoint, credential, or live deposit/);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(out).mode & 0o777, 0o600);
    assert.equal(fs.statSync(manifestPath).mode & 0o777, 0o600);
  }
});

test("candidate builder supports fossil traces but rejects other cards", (t) => {
  const cwd = workspace(t);
  run(cwd, ["init"]);
  const fossil = run(cwd, [
    "card",
    "add",
    "fossil",
    "--label",
    "Stable layered pattern",
  ]);
  const fossilId = fossil.stdout.match(/fos_[0-9a-f]+/)[0];
  const out = path.join(cwd, "fossil.json");
  run(cwd, [
    "contract",
    "build-quark-candidate",
    "--type",
    "fossil",
    "--id",
    fossilId,
    "--out",
    out,
    "--confirm",
  ]);
  const fossilCandidate = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(fossilCandidate.payload_kind, "fossil_trace");
  assert.equal(
    Object.hasOwn(fossilCandidate.projection.artifact, "content"),
    false
  );
  const fossilCanonical = Buffer.from(
    canonicalJson(fossilCandidate.projection.artifact),
    "utf8"
  );
  assert.equal(
    fossilCandidate.projection.content_hash,
    sha256(fossilCanonical)
  );
  assert.equal(
    fossilCandidate.projection.artifact_size_bytes,
    fossilCanonical.length
  );

  const memory = run(cwd, ["card", "add", "memory", "--label", "Readable note"]);
  const memoryId = memory.stdout.match(/mem_[0-9a-f]+/)[0];
  const refused = run(
    cwd,
    [
      "contract",
      "build-quark-candidate",
      "--type",
      "fossil",
      "--id",
      memoryId,
      "--out",
      path.join(cwd, "memory.json"),
      "--confirm",
    ],
    1
  );
  assert.match(refused.stderr, /not fossil_trace/);
  assert.equal(fs.existsSync(path.join(cwd, "memory.json")), false);
});

test("candidate construction fails closed on doctor drift or authorization changes", () => {
  const {
    buildQuarkCandidate,
  } = require("../dist/packages/core/quark_candidate.js");
  const artifact = {
    id: "hnd_abcdef123456",
    schema_version: "0.1",
    kind: "handoff_card",
    topic: "Test",
    from_surface: "chatgpt",
    target_surface: "quark",
    status: "open",
    decisions: [],
    open_questions: [],
    boundaries: [],
    usable_as: "context_only",
    created_at: "2026-06-21T00:00:00.000Z",
  };
  const baseDoctor = {
    schema_version: "0.1",
    kind: "continuity_contract_doctor_report",
    role: "producer",
    status: "healthy",
    contract_id: CONTRACT_ID,
    fixture_version: "candidate-0.3-v0",
    manifest_schema_version: "0.1",
    payload_schema_version: "0.3",
    payload_sha256: "sha256:" + "1".repeat(64),
    canonical_artifact_hash: "sha256:" + "2".repeat(64),
    artifact_size_bytes: 408,
    network_authorized: false,
    checks: { contract_lock: true, network_authorized: true },
  };

  assert.throws(
    () =>
      buildQuarkCandidate(artifact, "handoff_card", {
        ...baseDoctor,
        status: "drift",
      }),
    /reports drift/
  );
  assert.throws(
    () =>
      buildQuarkCandidate(artifact, "handoff_card", {
        ...baseDoctor,
        network_authorized: true,
      }),
    /network_authorized must remain false/
  );
  assert.throws(
    () =>
      buildQuarkCandidate(artifact, "handoff_card", {
        ...baseDoctor,
        contract_id: "sha256:" + "0".repeat(64),
      }),
    /refusing unknown contract ID/
  );
  assert.throws(
    () =>
      buildQuarkCandidate(
        {
          ...artifact,
          decisions: [
            {
              text: "x".repeat(17_000),
              confidence: "medium",
              authority: false,
            },
          ],
        },
        "handoff_card",
        baseDoctor
      ),
    /artifact must be 1-16384 bytes/
  );
});

test("candidate builder dependency surface contains no network client", () => {
  const builderSource = fs.readFileSync(
    path.join(ROOT, "packages/core/quark_candidate.ts"),
    "utf8"
  );
  const doctorSource = fs.readFileSync(
    path.join(ROOT, "scripts/quark-contract-doctor.js"),
    "utf8"
  );
  const source = [
    builderSource,
    doctorSource,
    fs.readFileSync(path.join(ROOT, "scripts/lib/quark-contract.js"), "utf8"),
  ].join("\n");
  for (const forbidden of [
    "node:http",
    "node:https",
    "node:net",
    "fetch(",
    "axios",
    "undici",
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden.replace("(", "\\(")));
  }
  assert.deepEqual(
    fs.readdirSync(path.join(ROOT, "packages/adapters/quark")),
    ["README.md"]
  );
  assert.doesNotMatch(doctorSource, /quark_candidate|buildQuarkCandidate/);
  assert.match(
    fs.readFileSync(path.join(ROOT, "packages/cli/index.ts"), "utf8"),
    /readHealthyContractDoctor\(\)[\s\S]*assertDoctorAllowsCandidateBuild\(doctor\)[\s\S]*buildQuarkCandidate/
  );
});
