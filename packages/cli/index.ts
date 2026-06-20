#!/usr/bin/env node
/**
 * doppel — the Doppelganger CLI. The first real product (per the source
 * design: "the CLI must be the first real product, not the extension").
 *
 * V1 MVP commands:
 *   doppel init
 *   doppel card add <kind> --label <label> [--content <text>] [--sensitivity ...] [--deep-allowed]
 *   doppel card import --from markdown --file <path> (--dry-run | --confirm)
 *   doppel card list [<kind>]
 *   doppel card revoke --id <id> [--reason <text>]
 *   doppel context build --scope <scope> --target <target> [--format markdown|json] [--out <file>]
 *   doppel handoff create --topic <topic> --from <surface> [--to <surface>]
 *                          [--decision <text>]* [--open-question <text>]* [--boundary <text>]*
 *   doppel handoff list
 *   doppel handoff export --id <id> [--format markdown|json] [--out <file>]
 *   doppel handoff revoke --id <id> [--reason <text>]
 *   doppel receipt list
 *   doppel receipt show --id <id>
 *   doppel quark dry-run --type <kind> --id <id>
 *   doppel quark deposit ...   -> explicitly not implemented in V1 (see docs/quark-integration.md)
 *   doppel status
 *   doppel inspect
 *   doppel doctor
 */
import { Vault } from "../core/vault";
import { createCard, resolveCardKind, Card, CardKind } from "../core/cards";
import { ScopeName, SCOPES } from "../core/scopes";
import { buildContextPack, renderContextPackMarkdown } from "../core/context_pack";
import {
  buildHandoffExport,
  createHandoffCard,
  renderHandoffMarkdown,
} from "../core/handoff";
import { createReceipt, formatReceiptDetails, formatReceiptLine } from "../core/receipts";
import { buildContinuityEnvelope, assertContinuityEnvelope } from "../core/policy";
import { exportMarkdown, exportJson, copyToClipboard } from "../adapters/file-export";
import { renderDoctorReport, runDoctor } from "../core/doctor";
import { loadMarkdownCard } from "../core/markdown_import";

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string[]>;
}

/**
 * Flags that never take a value. Every other --flag always consumes the
 * next token as its value, even if that token itself starts with "--" —
 * otherwise a --content/--label value the user wrote starting with "--"
 * would be silently dropped and replaced with the literal string "true".
 */
const BOOLEAN_FLAGS = new Set(["deep-allowed", "dry-run", "confirm"]);

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags.set(key, ["true"]);
        i += 1;
        continue;
      }
      const next = argv[i + 1];
      if (next === undefined) {
        throw new Error(`cli: --${key} expects a value`);
      }
      const list = flags.get(key) ?? [];
      list.push(next);
      flags.set(key, list);
      i += 2;
    } else {
      positional.push(token);
      i += 1;
    }
  }
  return { positional, flags };
}

function flag(args: ParsedArgs, key: string): string | undefined {
  return args.flags.get(key)?.[args.flags.get(key)!.length - 1];
}

function flagList(args: ParsedArgs, key: string): string[] {
  return args.flags.get(key) ?? [];
}

function assertAllowedFlags(args: ParsedArgs, allowed: readonly string[], where: string): void {
  const allowedSet = new Set(allowed);
  for (const key of args.flags.keys()) {
    if (!allowedSet.has(key)) {
      throw new Error(`${where}: unknown flag --${key}`);
    }
  }
}

type ExportFormat = "markdown" | "json";

function exportFormat(args: ParsedArgs, where: string): ExportFormat {
  const format = flag(args, "format") ?? "markdown";
  if (format !== "markdown" && format !== "json") {
    throw new Error(`${where}: --format must be markdown or json`);
  }
  return format;
}

function fail(message: string): never {
  process.stderr.write(`doppel: ${message}\n`);
  process.exit(1);
}

function printUsage(): void {
  process.stdout.write(
    [
      "doppel — local-first continuity toolkit",
      "",
      "Usage:",
      "  doppel init",
      "  doppel card add <memory|boundary|project|fossil> --label <label> [--content <text>] [--sensitivity public|normal|sensitive] [--deep-allowed]",
      "  doppel card import --from markdown --file <path> (--dry-run | --confirm)",
      "  doppel card list [<kind>]",
      "  doppel card revoke --id <id> [--reason <text>]",
      "  doppel context build --scope <minimal|project|deep|fossil_only> --target <ai_name> [--format markdown|json] [--out <file>]",
      "  doppel handoff create --topic <topic> --from <surface> [--to <surface>] [--decision <text> ...] [--open-question <text> ...] [--boundary <text> ...]",
      "  doppel handoff list",
      "  doppel handoff export --id <id> [--format markdown|json] [--out <file>]",
      "  doppel handoff revoke --id <id> [--reason <text>]",
      "  doppel receipt list",
      "  doppel receipt show --id <id>",
      "  doppel quark dry-run --type <memory|boundary|project|fossil|handoff> --id <id>",
      "  doppel quark deposit ...   (not implemented in V1 — see docs/quark-integration.md)",
      "  doppel status",
      "  doppel inspect",
      "  doppel doctor",
      "",
    ].join("\n")
  );
}

function cmdInit(): void {
  const vault = new Vault();
  const { created, manifest } = vault.init();
  if (created) {
    process.stdout.write(`Initialized .doppelganger/ at ${vault.root}\n`);
    process.stdout.write(`Identity anchor: ${manifest.identity.pseudonymous_id} (local, authority: false)\n`);
  } else {
    process.stdout.write(`Already initialized at ${vault.root}\n`);
  }
}

function cmdCardAdd(args: ParsedArgs): void {
  assertAllowedFlags(args, ["label", "content", "sensitivity", "deep-allowed"], "card add");
  const kindAlias = args.positional[0];
  if (!kindAlias) fail("card add: missing kind (memory|boundary|project|fossil)");
  const label = flag(args, "label");
  if (!label) fail("card add: --label is required");

  const kind: CardKind = resolveCardKind(kindAlias);
  const sensitivity = flag(args, "sensitivity") as Card["sensitivity"] | undefined;
  if (sensitivity && !["public", "normal", "sensitive"].includes(sensitivity)) {
    fail(`card add: invalid --sensitivity "${sensitivity}"`);
  }

  const vault = new Vault();
  const card = createCard(kind, label, {
    content: flag(args, "content"),
    sensitivity,
    deep_allowed: args.flags.has("deep-allowed"),
  });
  vault.saveCard(card);
  process.stdout.write(`Added ${card.kind} ${card.id} — "${card.label}"\n`);
}

function cmdCardImport(args: ParsedArgs): void {
  assertAllowedFlags(args, ["from", "file", "dry-run", "confirm"], "card import");
  if (args.positional.length > 0) {
    fail(`card import: unexpected argument "${args.positional[0]}"`);
  }
  const source = flag(args, "from");
  const file = flag(args, "file");
  const dryRun = args.flags.has("dry-run");
  const confirm = args.flags.has("confirm");

  if (source !== "markdown") {
    fail('card import: --from must be "markdown"');
  }
  if (!file) fail("card import: --file is required");
  if (!dryRun && !confirm) {
    fail(
      "card import: refusing import without --dry-run or --confirm.\n" +
        "Markdown/Notion content is not a valid continuity object until validated by Doppelganger."
    );
  }
  if (dryRun && confirm) {
    fail(
      "card import: choose exactly one of --dry-run or --confirm.\n" +
        "Markdown/Notion content is not a valid continuity object until validated by Doppelganger."
    );
  }

  const imported = loadMarkdownCard(file);
  if (dryRun) {
    process.stdout.write("Validated canonical card preview:\n");
    process.stdout.write(JSON.stringify(imported.card, null, 2) + "\n");
    process.stdout.write(
      "\n(dry run only — the vault was not modified; id and timestamps are provisional)\n"
    );
    return;
  }

  const vault = new Vault();
  vault.saveCard(imported.card);
  process.stdout.write(
    `Imported ${imported.card.kind} ${imported.card.id} from ${imported.file} — ` +
      `"${imported.card.label}"\n`
  );
}

function cmdCardList(args: ParsedArgs): void {
  assertAllowedFlags(args, [], "card list");
  const vault = new Vault();
  const kindAlias = args.positional[0];
  const kind = kindAlias ? resolveCardKind(kindAlias) : undefined;
  const cards = vault.listCards(kind);
  if (cards.length === 0) {
    process.stdout.write("No cards.\n");
    return;
  }
  for (const c of cards) {
    process.stdout.write(
      `${c.id}  ${c.kind}  sensitivity=${c.sensitivity}  deep_allowed=${c.deep_allowed}  "${c.label}"\n`
    );
  }
}

function cmdCardRevoke(args: ParsedArgs): void {
  assertAllowedFlags(args, ["id", "reason"], "card revoke");
  const id = flag(args, "id");
  if (!id) fail("card revoke: --id is required");
  const vault = new Vault();
  const revocation = vault.revokeCard(id, flag(args, "reason"));
  if (!revocation) fail(`card revoke: no card found with id "${id}"`);
  process.stdout.write(`Revoked card ${id}. Record: ${revocation.id}\n`);
}

function cmdContextBuild(args: ParsedArgs): void {
  assertAllowedFlags(args, ["scope", "target", "format", "out"], "context build");
  const scope = flag(args, "scope") as ScopeName | undefined;
  const target = flag(args, "target");
  if (!scope || !SCOPES.includes(scope)) {
    fail(`context build: --scope must be one of ${SCOPES.join(", ")}`);
  }
  if (!target) fail("context build: --target is required");
  if (scope === "handoff") {
    fail(
      'context build: scope "handoff" requires a specific handoff. ' +
        'Use "doppel handoff export --id <id>".'
    );
  }

  const vault = new Vault();
  const cards = vault.listCards();
  const pack = buildContextPack({ cards, scope: scope!, target: target! });
  const format = exportFormat(args, "context build");
  const output =
    format === "markdown"
      ? renderContextPackMarkdown(pack)
      : JSON.stringify(pack, null, 2) + "\n";

  process.stdout.write(output);

  const out = flag(args, "out");
  if (out) {
    const resolved =
      format === "markdown" ? exportMarkdown(output, out) : exportJson(pack, out);
    process.stderr.write(`\nWritten to ${resolved}\n`);
  }

  const exportedIds = [
    ...pack.sections.preferences,
    ...pack.sections.project_context,
    ...pack.sections.boundaries,
    ...pack.sections.fossil_traces,
  ].map((c) => c.id);
  const receipt = createReceipt({
    target: target!,
    scope: scope!,
    cardsExported: exportedIds,
    cardContentIncluded: pack.policy.card_content_included,
  });
  vault.appendReceipt(receipt);
  process.stderr.write(`Receipt written: ${receipt.id}\n`);
}

function cmdHandoffCreate(args: ParsedArgs): void {
  assertAllowedFlags(
    args,
    ["topic", "from", "to", "decision", "open-question", "boundary"],
    "handoff create"
  );
  const topic = flag(args, "topic");
  const from = flag(args, "from");
  if (!topic) fail("handoff create: --topic is required");
  if (!from) fail("handoff create: --from is required");

  const vault = new Vault();
  const handoff = createHandoffCard(topic!, from!, {
    to: flag(args, "to"),
    decisions: flagList(args, "decision").map((text) => ({ text })),
    open_questions: flagList(args, "open-question"),
    boundaries: flagList(args, "boundary"),
  });
  vault.saveHandoff(handoff);
  process.stdout.write(JSON.stringify(handoff, null, 2) + "\n");
}

function cmdHandoffList(args: ParsedArgs): void {
  assertAllowedFlags(args, [], "handoff list");
  const vault = new Vault();
  const handoffs = vault.listHandoffs();
  if (handoffs.length === 0) {
    process.stdout.write("No handoffs.\n");
    return;
  }
  for (const h of handoffs) {
    process.stdout.write(`${h.id}  ${h.status}  "${h.topic}"  ${h.from_surface} -> ${h.target_surface}\n`);
  }
}

function cmdHandoffExport(args: ParsedArgs): void {
  assertAllowedFlags(args, ["id", "format", "out"], "handoff export");
  const id = flag(args, "id");
  if (!id) fail("handoff export: --id is required");
  const vault = new Vault();
  const handoff = vault.findHandoff(id!);
  if (!handoff) fail(`handoff export: no handoff found with id "${id}"`);

  const format = exportFormat(args, "handoff export");
  const handoffExport = buildHandoffExport(handoff!);
  const output =
    format === "markdown"
      ? renderHandoffMarkdown(handoff!)
      : JSON.stringify(handoffExport, null, 2) + "\n";
  process.stdout.write(output);

  const out = flag(args, "out");
  if (out) {
    const resolved =
      format === "markdown"
        ? exportMarkdown(output, out)
        : exportJson(handoffExport, out);
    process.stderr.write(`\nWritten to ${resolved}\n`);
  } else {
    const clipboard = copyToClipboard(output);
    if (clipboard.copied) {
      process.stderr.write(`\nCopied to clipboard via ${clipboard.tool}.\n`);
    } else {
      process.stderr.write(`\nNot copied to clipboard: ${clipboard.reason}\n`);
    }
  }
  const receipt = createReceipt({
    target: handoff!.target_surface,
    scope: "handoff",
    cardsExported: [],
    handoffsExported: [handoff!.id],
    cardContentIncluded: false,
  });
  vault.appendReceipt(receipt);
  process.stderr.write(`Receipt written: ${receipt.id}\n`);
}

function cmdHandoffRevoke(args: ParsedArgs): void {
  assertAllowedFlags(args, ["id", "reason"], "handoff revoke");
  const id = flag(args, "id");
  if (!id) fail("handoff revoke: --id is required");
  const vault = new Vault();
  const revocation = vault.revokeHandoff(id, flag(args, "reason"));
  if (!revocation) fail(`handoff revoke: no handoff found with id "${id}"`);
  process.stdout.write(`Revoked handoff ${id}. Record: ${revocation.id}\n`);
}

function cmdReceiptList(args: ParsedArgs): void {
  assertAllowedFlags(args, [], "receipt list");
  const vault = new Vault();
  const receipts = vault.listReceipts();
  if (receipts.length === 0) {
    process.stdout.write("No receipts.\n");
    return;
  }
  for (const r of receipts) {
    process.stdout.write(formatReceiptLine(r) + "\n");
  }
}

function cmdReceiptShow(args: ParsedArgs): void {
  assertAllowedFlags(args, ["id"], "receipt show");
  const id = flag(args, "id");
  if (!id) fail("receipt show: --id is required");
  const vault = new Vault();
  const receipt = vault.findReceipt(id);
  if (!receipt) fail(`receipt show: no receipt found with id "${id}"`);
  process.stdout.write(formatReceiptDetails(receipt));
}

function cmdQuarkDryRun(args: ParsedArgs): void {
  assertAllowedFlags(args, ["type", "id"], "quark dry-run");
  const type = flag(args, "type");
  const id = flag(args, "id");
  if (!type || !id) fail("quark dry-run: --type and --id are required");

  const vault = new Vault();
  let cardContentIncluded = false;
  let artifact: Card | ReturnType<typeof createHandoffCard>;

  let kind: string;
  if (type === "handoff") {
    const handoff = vault.findHandoff(id!);
    if (!handoff) fail(`quark dry-run: no handoff found with id "${id}"`);
    kind = "handoff_card";
    artifact = handoff!;
    cardContentIncluded = false;
  } else {
    const expectedKind = resolveCardKind(type!);
    const card = vault.findCard(id!);
    if (!card) fail(`quark dry-run: no card found with id "${id}"`);
    if (card!.kind !== expectedKind) {
      fail(`quark dry-run: card "${id}" is kind "${card!.kind}", not "${expectedKind}" (--type ${type})`);
    }
    kind = card!.kind;
    artifact = card!;
    cardContentIncluded = card!.kind !== "fossil_trace" && !!card!.content;
  }

  const envelope = buildContinuityEnvelope(cardContentIncluded);
  assertContinuityEnvelope(envelope, "quark dry-run");
  const preview = {
    would_send: true,
    kind,
    id,
    artifact,
    continuity_envelope: envelope,
    target: "Quark-AI",
  };

  process.stdout.write("Exact payload preview:\n");
  process.stdout.write(JSON.stringify(preview, null, 2) + "\n");
  process.stdout.write("\n(dry run only — no network call was made)\n");
}

function cmdQuarkDeposit(): void {
  process.stderr.write(
    [
      "doppel: quark deposit is not implemented in V1.",
      "Quark-AI does not yet expose the dedicated continuity intake this requires",
      "(POST /api/quark/intake/continuity). Existing storage interfaces are not compatible.",
      "See docs/quark-integration.md and packages/adapters/quark/README.md.",
      "Use \"doppel quark dry-run\" to preview the envelope locally.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

function cmdStatus(): void {
  const vault = new Vault();
  if (!vault.isInitialized()) {
    process.stdout.write("Mode: local-only\nNot initialized. Run \"doppel init\".\n");
    return;
  }
  const config = vault.loadConfig();
  process.stdout.write(`Mode: ${config.mode}\n`);
  process.stdout.write(`Quark sync: ${config.quark_sync}\n`);
  process.stdout.write(`Raw text capture: ${config.raw_text_capture}\n`);
  process.stdout.write(`Vault: ${vault.root}\n`);
}

function cmdInspect(): void {
  const vault = new Vault();
  if (!vault.isInitialized()) fail("inspect: not initialized. Run \"doppel init\".");
  const manifest = vault.loadManifest();
  const cards = vault.listCards();
  const handoffs = vault.listHandoffs();
  const receipts = vault.listReceipts();
  const revocations = vault.listRevocations();

  process.stdout.write(`Vault: ${vault.root}\n`);
  process.stdout.write(`Identity: ${manifest.identity.pseudonymous_id} (${manifest.identity.kind})\n`);
  process.stdout.write(`Created: ${manifest.created_at}\n`);
  process.stdout.write(`Cards: ${cards.length}\n`);
  for (const kind of ["memory_card", "boundary_card", "project_card", "fossil_trace"] as CardKind[]) {
    const count = cards.filter((c) => c.kind === kind).length;
    if (count > 0) process.stdout.write(`  - ${kind}: ${count}\n`);
  }
  process.stdout.write(`Handoffs: ${handoffs.length}\n`);
  process.stdout.write(`Receipts: ${receipts.length}\n`);
  process.stdout.write(`Revocations: ${revocations.length}\n`);
}

function cmdDoctor(): void {
  const report = runDoctor(new Vault());
  process.stdout.write(renderDoctorReport(report));
  if (!report.healthy) process.exitCode = 1;
}

function assertNoTrailingArgs(command: string, sub: string | undefined, rest: string[]): void {
  if (sub !== undefined || rest.length > 0) {
    fail(`${command}: unexpected argument "${sub ?? rest[0]}"`);
  }
}

function main(): void {
  const [command, sub, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  switch (command) {
    case "init":
      assertNoTrailingArgs("init", sub, rest);
      return cmdInit();

    case "card": {
      const args = parseArgs(rest);
      if (sub === "add") return cmdCardAdd(args);
      if (sub === "import") return cmdCardImport(args);
      if (sub === "list") return cmdCardList(args);
      if (sub === "revoke") return cmdCardRevoke(args);
      return fail(`unknown subcommand "card ${sub}"`);
    }

    case "context": {
      const args = parseArgs(rest);
      if (sub === "build") return cmdContextBuild(args);
      return fail(`unknown subcommand "context ${sub}"`);
    }

    case "handoff": {
      const args = parseArgs(rest);
      if (sub === "create") return cmdHandoffCreate(args);
      if (sub === "list") return cmdHandoffList(args);
      if (sub === "export") return cmdHandoffExport(args);
      if (sub === "revoke") return cmdHandoffRevoke(args);
      return fail(`unknown subcommand "handoff ${sub}"`);
    }

    case "receipt": {
      const args = parseArgs(rest);
      if (sub === "list") return cmdReceiptList(args);
      if (sub === "show") return cmdReceiptShow(args);
      return fail(`unknown subcommand "receipt ${sub}"`);
    }

    case "quark": {
      const args = parseArgs(rest);
      if (sub === "dry-run") return cmdQuarkDryRun(args);
      if (sub === "deposit") return cmdQuarkDeposit();
      return fail(`unknown subcommand "quark ${sub}"`);
    }

    case "status":
      assertNoTrailingArgs("status", sub, rest);
      return cmdStatus();

    case "inspect":
      assertNoTrailingArgs("inspect", sub, rest);
      return cmdInspect();

    case "doctor":
      assertNoTrailingArgs("doctor", sub, rest);
      return cmdDoctor();

    default:
      printUsage();
      fail(`unknown command "${command}"`);
  }
}

try {
  main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
