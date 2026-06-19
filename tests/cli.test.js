const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const CLI = path.resolve(__dirname, "../dist/packages/cli/index.js");

function workspace(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "doppel-test-"));
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

function init(cwd) {
  run(cwd, ["init"]);
}

function firstJson(dir) {
  return path.join(dir, fs.readdirSync(dir).find((name) => name.endsWith(".json")));
}

test("vault rejects a tampered card instead of masking authority", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "memory", "--label", "Style", "--content", "Layered"]);
  const file = firstJson(path.join(cwd, ".doppelganger/cards/memory_card"));
  const card = JSON.parse(fs.readFileSync(file, "utf8"));
  card.authority = true;
  fs.writeFileSync(file, JSON.stringify(card));

  const result = run(cwd, ["context", "build", "--scope", "minimal", "--target", "claude"], 1);
  assert.match(result.stderr, /authority must never be true/);
});

test("vault rejects undeclared fields instead of carrying dormant authority", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "memory", "--label", "Style"]);
  const file = firstJson(path.join(cwd, ".doppelganger/cards/memory_card"));
  const card = JSON.parse(fs.readFileSync(file, "utf8"));
  card.decision_authority = true;
  fs.writeFileSync(file, JSON.stringify(card));

  const result = run(cwd, ["card", "list"], 1);
  assert.match(result.stderr, /unknown field\(s\): decision_authority/);
});

test("vault rejects a tampered handoff decision before export", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const created = run(cwd, [
    "handoff",
    "create",
    "--topic",
    "Transfer",
    "--from",
    "chatgpt",
    "--decision",
    "Keep V0 small",
  ]);
  const id = JSON.parse(created.stdout).id;
  const file = path.join(cwd, `.doppelganger/handoffs/${id}.json`);
  const handoff = JSON.parse(fs.readFileSync(file, "utf8"));
  handoff.decisions[0].authority = true;
  fs.writeFileSync(file, JSON.stringify(handoff));

  const result = run(cwd, ["handoff", "export", "--id", id], 1);
  assert.match(result.stderr, /authority must never be true/);
});

test("vault reports malformed JSON with the affected path", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "memory", "--label", "Style"]);
  const file = firstJson(path.join(cwd, ".doppelganger/cards/memory_card"));
  fs.writeFileSync(file, "{broken");

  const result = run(cwd, ["card", "list"], 1);
  assert.match(result.stderr, /invalid JSON/);
  assert.match(result.stderr, /memory_card/);
});

test("fossil_only exports fossil traces and writes a receipt", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "fossil", "--label", "Stable layered pattern"]);

  const result = run(cwd, ["context", "build", "--scope", "fossil_only", "--target", "quark"]);
  assert.match(result.stdout, /## Fossil Traces/);
  assert.match(result.stdout, /Stable layered pattern/);
  const receipts = fs.readFileSync(path.join(cwd, ".doppelganger/receipts.jsonl"), "utf8").trim();
  assert.match(receipts, /fos_/);
});

test("handoff scope cannot create an empty generic context pack", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const result = run(
    cwd,
    ["context", "build", "--scope", "handoff", "--target", "claude"],
    1
  );
  assert.match(result.stderr, /handoff export --id/);
});

test("context and handoff exports always write receipts", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "memory", "--label", "Style", "--content", "Layered"]);
  run(cwd, ["context", "build", "--scope", "minimal", "--target", "claude"]);
  const created = run(cwd, [
    "handoff",
    "create",
    "--topic",
    "Transfer",
    "--from",
    "chatgpt",
    "--decision",
    "Keep V0 small",
  ]);
  const handoffId = JSON.parse(created.stdout).id;
  run(cwd, ["handoff", "export", "--id", handoffId, "--out", path.join(cwd, "handoff.md")]);

  const receipts = fs
    .readFileSync(path.join(cwd, ".doppelganger/receipts.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(receipts.length, 2);
  assert.deepEqual(receipts[1].handoffs_exported, [handoffId]);
});

test("revocation removes local artifacts and leaves an audit record", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const added = run(cwd, ["card", "add", "memory", "--label", "Style"]);
  const id = added.stdout.match(/mem_[0-9a-f]+/)[0];
  run(cwd, ["card", "revoke", "--id", id, "--reason", "No longer shared"]);

  assert.doesNotMatch(run(cwd, ["card", "list"]).stdout, new RegExp(id));
  const revocations = fs.readFileSync(
    path.join(cwd, ".doppelganger/revocations.jsonl"),
    "utf8"
  );
  assert.match(revocations, new RegExp(id));
});

test("vault uses private filesystem permissions", (t) => {
  if (process.platform === "win32") return;
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "memory", "--label", "Style"]);
  const rootMode = fs.statSync(path.join(cwd, ".doppelganger")).mode & 0o777;
  const file = firstJson(path.join(cwd, ".doppelganger/cards/memory_card"));
  const fileMode = fs.statSync(file).mode & 0o777;
  assert.equal(rootMode, 0o700);
  assert.equal(fileMode, 0o600);
});

test("unknown flags fail loudly", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const result = run(
    cwd,
    ["card", "add", "memory", "--label", "Secret", "--sensitivty", "sensitive"],
    1
  );
  assert.match(result.stderr, /unknown flag --sensitivty/);
});

test("Quark dry-run reveals the exact local payload", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const added = run(cwd, [
    "card",
    "add",
    "memory",
    "--label",
    "Style",
    "--content",
    "Answer in layers",
  ]);
  const id = added.stdout.match(/mem_[0-9a-f]+/)[0];
  const result = run(cwd, ["quark", "dry-run", "--type", "memory", "--id", id]);
  assert.match(result.stdout, /Exact payload preview/);
  assert.match(result.stdout, /Answer in layers/);
  assert.match(result.stdout, /"authority": false/);
  assert.match(result.stdout, /no network call was made/);
});

test("README quickstart output stays aligned with the checked-in fixture", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, [
    "card",
    "add",
    "memory",
    "--label",
    "Response style",
    "--content",
    "Answer in layers, avoid generic replies.",
  ]);
  run(cwd, [
    "card",
    "add",
    "boundary",
    "--label",
    "No diagnosis",
    "--content",
    "turn my traces or emotions into a diagnosis",
  ]);
  const result = run(cwd, ["context", "build", "--scope", "minimal", "--target", "claude"]);
  const fixture = fs.readFileSync(
    path.resolve(__dirname, "../examples/minimal/context_pack.md"),
    "utf8"
  );
  assert.equal(result.stdout, fixture);
});

test("doctor reports a healthy local-only vault without making network claims", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "boundary", "--label", "No diagnosis"]);
  const result = run(cwd, ["doctor"]);
  assert.match(result.stdout, /\[OK\] Vault found: yes/);
  assert.match(result.stdout, /\[OK\] Boundary cards: 1/);
  assert.match(result.stdout, /\[OK\] Network: disabled/);
  assert.match(result.stdout, /\[OK\] Quark adapter: dry-run only/);
  assert.match(result.stdout, /\[OK\] Policy chokepoint: active/);
  assert.match(result.stdout, /Overall: healthy/);
});

test("doctor points an uninitialized user to doppel init", (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ["doctor"], 1);
  assert.match(result.stdout, /Vault found: no/);
  assert.match(result.stdout, /doppel init/);
});

test("context build supports machine-readable JSON and writes private files", (t) => {
  const cwd = workspace(t);
  init(cwd);
  run(cwd, ["card", "add", "project", "--label", "V1.1", "--content", "Field hardening"]);
  const out = path.join(cwd, "context.json");
  const result = run(cwd, [
    "context",
    "build",
    "--scope",
    "project",
    "--target",
    "chatgpt",
    "--format",
    "json",
    "--out",
    out,
  ]);
  const pack = JSON.parse(result.stdout);
  assert.equal(pack.target, "chatgpt");
  assert.equal(pack.target_profile.id, "chatgpt");
  assert.equal(pack.sections.project_context[0].label, "V1.1");
  assert.deepEqual(JSON.parse(fs.readFileSync(out, "utf8")), pack);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  }
});

test("handoff JSON export and receipt detail remain readable", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const created = run(cwd, [
    "handoff",
    "create",
    "--topic",
    "Quark Intake",
    "--from",
    "chatgpt",
    "--to",
    "claude",
    "--decision",
    "Use quarantine",
  ]);
  const id = JSON.parse(created.stdout).id;
  const exported = run(cwd, ["handoff", "export", "--id", id, "--format", "json"]);
  const handoffExport = JSON.parse(exported.stdout);
  assert.equal(handoffExport.handoff.id, id);
  assert.equal(handoffExport.target_profile.id, "claude");

  const receipts = fs
    .readFileSync(path.join(cwd, ".doppelganger/receipts.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  const shown = run(cwd, ["receipt", "show", "--id", receipts[0].id]);
  assert.match(shown.stdout, new RegExp(`Handoffs exported: ${id}`));
  assert.match(shown.stdout, /grants no future consent/);
});

test("target profiles are bounded presentation templates", () => {
  const { resolveTargetProfile } = require("../dist/packages/core/targets.js");
  assert.equal(resolveTargetProfile("chatgpt").id, "chatgpt");
  assert.equal(resolveTargetProfile("anthropic").id, "claude");
  assert.equal(resolveTargetProfile("google").id, "gemini");
  assert.equal(resolveTargetProfile("unknown-host").id, "generic");
  for (const target of ["chatgpt", "claude", "gemini", "unknown-host"]) {
    const profile = resolveTargetProfile(target);
    assert.doesNotMatch(profile.handling_note, /authority:\s*true/i);
    assert.match(profile.handling_note, /context|reference/i);
  }
});

test("invalid formats and trailing command arguments fail clearly", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const invalidFormat = run(
    cwd,
    ["context", "build", "--scope", "minimal", "--target", "claude", "--format", "xml"],
    1
  );
  assert.match(invalidFormat.stderr, /--format must be markdown or json/);
  const trailing = run(cwd, ["doctor", "--mystery"], 1);
  assert.match(trailing.stderr, /unexpected argument/);
});

test("real Quark deposit remains blocked until the continuity intake exists", (t) => {
  const cwd = workspace(t);
  init(cwd);
  const result = run(cwd, ["quark", "deposit", "--confirm"], 1);
  assert.match(result.stderr, /POST \/api\/quark\/intake\/continuity/);
  assert.match(result.stderr, /Existing storage interfaces are not compatible/);
});
