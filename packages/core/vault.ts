/**
 * vault.ts — the local chest. Loads and saves cards, handoffs, receipts and
 * config. Works fully offline. No network code lives in this file.
 *
 * V0 layout:
 *   .doppelganger/
 *   ├── manifest.json
 *   ├── cards/<kind>/<id>.json
 *   ├── handoffs/<id>.json
 *   ├── receipts.jsonl
 *   └── config.json
 *
 * V1 will add encryption at rest. V0 deliberately does not block on it.
 */
import * as fs from "fs";
import * as path from "path";
import { Card, CardKind } from "./cards";
import { HandoffCard } from "./handoff";
import { TrustReceipt } from "./receipts";
import { IdentityAnchor, createIdentityAnchor } from "./identity";
import { assertCardInvariants, assertHandoffInvariants } from "./policy";

export interface Manifest {
  schema_version: "0.1";
  kind: "manifest";
  identity: IdentityAnchor;
  created_at: string;
  vault_version: "v0_local_file_storage";
}

export interface VaultConfig {
  mode: "local-only";
  quark_sync: "disabled" | "enabled";
  raw_text_capture: "disabled" | "enabled";
}

const DEFAULT_CONFIG: VaultConfig = {
  mode: "local-only",
  quark_sync: "disabled",
  raw_text_capture: "disabled",
};

export class Vault {
  readonly root: string;

  constructor(root: string = path.join(process.cwd(), ".doppelganger")) {
    this.root = root;
  }

  private get manifestPath() {
    return path.join(this.root, "manifest.json");
  }
  private get configPath() {
    return path.join(this.root, "config.json");
  }
  private get cardsDir() {
    return path.join(this.root, "cards");
  }
  private get handoffsDir() {
    return path.join(this.root, "handoffs");
  }
  private get receiptsPath() {
    return path.join(this.root, "receipts.jsonl");
  }

  isInitialized(): boolean {
    return fs.existsSync(this.manifestPath);
  }

  /** Idempotent. Returns { created: boolean } so the CLI can report accurately. */
  init(): { created: boolean; manifest: Manifest } {
    if (this.isInitialized()) {
      return { created: false, manifest: this.loadManifest() };
    }

    fs.mkdirSync(this.cardsDir, { recursive: true });
    fs.mkdirSync(this.handoffsDir, { recursive: true });
    if (!fs.existsSync(this.receiptsPath)) {
      fs.writeFileSync(this.receiptsPath, "", "utf8");
    }

    const manifest: Manifest = {
      schema_version: "0.1",
      kind: "manifest",
      identity: createIdentityAnchor("local"),
      created_at: new Date().toISOString(),
      vault_version: "v0_local_file_storage",
    };
    this.saveManifest(manifest);
    this.saveConfig(DEFAULT_CONFIG);

    return { created: true, manifest };
  }

  private assertInitialized() {
    if (!this.isInitialized()) {
      throw new Error(
        `vault: not initialized at ${this.root}. Run "doppel init" first.`
      );
    }
  }

  loadManifest(): Manifest {
    this.assertInitialized();
    return JSON.parse(fs.readFileSync(this.manifestPath, "utf8")) as Manifest;
  }

  saveManifest(manifest: Manifest): void {
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  loadConfig(): VaultConfig {
    if (!fs.existsSync(this.configPath)) return { ...DEFAULT_CONFIG };
    return JSON.parse(fs.readFileSync(this.configPath, "utf8")) as VaultConfig;
  }

  saveConfig(config: VaultConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  }

  // --- cards -------------------------------------------------------------

  saveCard(card: Card): void {
    this.assertInitialized();
    assertCardInvariants(card, `card:${card.kind}`);
    const dir = path.join(this.cardsDir, card.kind);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${card.id}.json`), JSON.stringify(card, null, 2) + "\n", "utf8");
  }

  listCards(kind?: CardKind): Card[] {
    this.assertInitialized();
    if (!fs.existsSync(this.cardsDir)) return [];
    const kinds = kind ? [kind] : fs.readdirSync(this.cardsDir);
    const cards: Card[] = [];
    for (const k of kinds) {
      const dir = path.join(this.cardsDir, k);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".json")) continue;
        cards.push(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Card);
      }
    }
    return cards.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  findCard(id: string): Card | undefined {
    return this.listCards().find((c) => c.id === id);
  }

  deleteCard(id: string): boolean {
    const card = this.findCard(id);
    if (!card) return false;
    const file = path.join(this.cardsDir, card.kind, `${card.id}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  // --- handoffs ------------------------------------------------------------

  saveHandoff(handoff: HandoffCard): void {
    this.assertInitialized();
    assertHandoffInvariants(handoff, "handoff");
    fs.mkdirSync(this.handoffsDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.handoffsDir, `${handoff.id}.json`),
      JSON.stringify(handoff, null, 2) + "\n",
      "utf8"
    );
  }

  listHandoffs(): HandoffCard[] {
    this.assertInitialized();
    if (!fs.existsSync(this.handoffsDir)) return [];
    return fs
      .readdirSync(this.handoffsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(this.handoffsDir, f), "utf8")) as HandoffCard)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  findHandoff(id: string): HandoffCard | undefined {
    return this.listHandoffs().find((h) => h.id === id);
  }

  // --- receipts ------------------------------------------------------------

  appendReceipt(receipt: TrustReceipt): void {
    this.assertInitialized();
    fs.appendFileSync(this.receiptsPath, JSON.stringify(receipt) + "\n", "utf8");
  }

  listReceipts(): TrustReceipt[] {
    this.assertInitialized();
    if (!fs.existsSync(this.receiptsPath)) return [];
    return fs
      .readFileSync(this.receiptsPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as TrustReceipt);
  }
}
