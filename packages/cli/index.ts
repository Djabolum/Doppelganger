#!/usr/bin/env node
/**
 * doppel — the Doppelganger CLI. The first real product (per the source
 * design: "Le CLI doit être le premier vrai produit. Pas l'extension.").
 *
 * V1 MVP commands:
 *   doppel init
 *   doppel card add <kind> --label <label> [--content <text>] [--sensitivity ...] [--deep-allowed]
 *   doppel card list [<kind>]
 *   doppel context build --scope <scope> --target <target> [--out <file>] [--no-receipt]
 *   doppel handoff create --topic <topic> --from <surface> [--to <surface>]
 *                          [--decision <text>]* [--open-question <text>]* [--boundary <text>]*
 *   doppel handoff list
 *   doppel handoff export --id <id> [--out <file>]
 *   doppel receipt list
 *   doppel quark dry-run --type <kind> --id <id>
 *   doppel quark deposit ...   -> explicitly not implemented in V1 (see docs/quark-integration.md)
 *   doppel status
 *   doppel inspect
 */
import { Vault } from "../core/vault";
import { createCard, resolveCardKind, Card, CardKind } from "../core/cards";
import { ScopeName, SCOPES } from "../core/scopes";
import { buildContextPack, renderContextPackMarkdown } from "../core/context_pack";
import { createHandoffCard, renderHandoffMarkdown } from "../core/handoff";
import { createReceipt, formatReceiptLine } from "../core/receipts";
import { buildContinuityEnvelope } from "../core/policy";
import { exportMarkdown, exportJson, copyToClipboard } from "../adapters/file-export";

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string[]>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        const list = flags.get(key) ?? [];
        list.push(next);
        flags.set(key, list);
        i += 2;
      } else {
        flags.set(key, flags.get(key) ?? ["true"]);
        i += 1;
      }
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
      "  doppel card list [<kind>]",
      "  doppel context build --scope <minimal|project|handoff|deep|fossil_only> --target <ai_name> [--out <file>] [--no-receipt]",
      "  doppel handoff create --topic <topic> --from <surface> [--to <surface>] [--decision <text> ...] [--open-question <text> ...] [--boundary <text> ...]",
      "  doppel handoff list",
      "  doppel handoff export --id <id> [--out <file>]",
      "  doppel receipt list",
      "  doppel quark dry-run --type <memory|boundary|project|fossil|handoff> --id <id>",
      "  doppel quark deposit ...   (not implemented in V1 — see docs/quark-integration.md)",
      "  doppel status",
      "  doppel inspect",
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

function cmdCardList(args: ParsedArgs): void {
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

function cmdContextBuild(args: ParsedArgs): void {
  const scope = flag(args, "scope") as ScopeName | undefined;
  const target = flag(args, "target");
  if (!scope || !SCOPES.includes(scope)) {
    fail(`context build: --scope must be one of ${SCOPES.join(", ")}`);
  }
  if (!target) fail("context build: --target is required");

  const vault = new Vault();
  const cards = vault.listCards();
  const pack = buildContextPack({ cards, scope: scope!, target: target! });
  const markdown = renderContextPackMarkdown(pack);

  process.stdout.write(markdown);

  const out = flag(args, "out");
  if (out) {
    const resolved = exportMarkdown(markdown, out);
    process.stderr.write(`\nWritten to ${resolved}\n`);
  }

  if (!args.flags.has("no-receipt")) {
    const exportedIds = [
      ...pack.sections.preferences,
      ...pack.sections.project_context,
      ...pack.sections.boundaries,
    ].map((c) => c.id);
    const receipt = createReceipt({
      target: target!,
      scope: scope!,
      cardsExported: exportedIds,
      rawTextIncluded: pack.policy.raw_text_included,
    });
    vault.appendReceipt(receipt);
    process.stderr.write(`Receipt written: ${receipt.id}\n`);
  }
}

function cmdHandoffCreate(args: ParsedArgs): void {
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

function cmdHandoffList(): void {
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
  const id = flag(args, "id");
  if (!id) fail("handoff export: --id is required");
  const vault = new Vault();
  const handoff = vault.findHandoff(id!);
  if (!handoff) fail(`handoff export: no handoff found with id "${id}"`);

  const markdown = renderHandoffMarkdown(handoff!);
  process.stdout.write(markdown);

  const out = flag(args, "out");
  if (out) {
    const resolved = exportMarkdown(markdown, out);
    process.stderr.write(`\nWritten to ${resolved}\n`);
  } else {
    const clipboard = copyToClipboard(markdown);
    if (clipboard.copied) {
      process.stderr.write(`\nCopied to clipboard via ${clipboard.tool}.\n`);
    }
  }
}

function cmdReceiptList(): void {
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

function cmdQuarkDryRun(args: ParsedArgs): void {
  const type = flag(args, "type");
  const id = flag(args, "id");
  if (!type || !id) fail("quark dry-run: --type and --id are required");

  const vault = new Vault();
  let rawTextIncluded = false;
  let label = "";

  let kind: string;
  if (type === "handoff") {
    const handoff = vault.findHandoff(id!);
    if (!handoff) fail(`quark dry-run: no handoff found with id "${id}"`);
    label = handoff!.topic;
    kind = "handoff_card";
    rawTextIncluded = false; // handoff cards never carry raw conversation text
  } else {
    const expectedKind = resolveCardKind(type!);
    const card = vault.findCard(id!);
    if (!card) fail(`quark dry-run: no card found with id "${id}"`);
    if (card!.kind !== expectedKind) {
      fail(`quark dry-run: card "${id}" is kind "${card!.kind}", not "${expectedKind}" (--type ${type})`);
    }
    label = card!.label;
    kind = card!.kind;
    rawTextIncluded = card!.kind !== "fossil_trace" && !!card!.content;
  }

  const envelope = buildContinuityEnvelope(rawTextIncluded);
  const preview = {
    would_send: true,
    kind,
    id,
    label,
    continuity_envelope: envelope,
    target: "Quark-AI",
  };

  process.stdout.write("Would send:\n");
  process.stdout.write(`- kind: ${preview.kind}\n`);
  process.stdout.write(`- id: ${preview.id}\n`);
  process.stdout.write(`- raw_text_included: ${envelope.raw_text_included}\n`);
  process.stdout.write(`- authority: ${envelope.authority}\n`);
  process.stdout.write(`- target: ${preview.target}\n`);
  process.stdout.write("\n(dry run only — no network call was made)\n");
}

function cmdQuarkDeposit(): void {
  process.stderr.write(
    [
      "doppel: quark deposit is not implemented in V1.",
      "Quark-AI does not yet expose the intake endpoints this would need",
      "(POST /api/quark/intake/{memory-card,boundary-card,handoff-card,fossil-trace,trust-receipt}).",
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
}

function main(): void {
  const [command, sub, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  switch (command) {
    case "init":
      return cmdInit();

    case "card": {
      const args = parseArgs(rest);
      if (sub === "add") return cmdCardAdd(args);
      if (sub === "list") return cmdCardList(args);
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
      if (sub === "list") return cmdHandoffList();
      if (sub === "export") return cmdHandoffExport(args);
      return fail(`unknown subcommand "handoff ${sub}"`);
    }

    case "receipt": {
      const args = parseArgs(rest);
      if (sub === "list") return cmdReceiptList();
      return fail(`unknown subcommand "receipt ${sub}"`);
    }

    case "quark": {
      const args = parseArgs(rest);
      if (sub === "dry-run") return cmdQuarkDryRun(args);
      if (sub === "deposit") return cmdQuarkDeposit();
      return fail(`unknown subcommand "quark ${sub}"`);
    }

    case "status":
      return cmdStatus();

    case "inspect":
      return cmdInspect();

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
