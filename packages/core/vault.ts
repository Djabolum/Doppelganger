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
 *   ├── revocations.jsonl
 *   └── config.json
 *
 * V1 will add encryption at rest. V0 deliberately does not block on it.
 */
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import { Card, CardKind } from "./cards";
import { HandoffCard } from "./handoff";
import { TrustReceipt } from "./receipts";
import { IdentityAnchor, createIdentityAnchor } from "./identity";
import {
  validateCard,
  validateHandoff,
  validateManifest,
  validateReceipt,
  validateRevocation,
  validateVaultConfig,
} from "./validation";

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

export interface RevocationRecord {
  id: string;
  kind: "card_revocation" | "handoff_revocation";
  artifact_id: string;
  artifact_kind: string;
  reason?: string;
  revoked_at: string;
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
  private get revocationsPath() {
    return path.join(this.root, "revocations.jsonl");
  }

  private ensureDirectory(dir: string): void {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
  }

  private writePrivateFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
  }

  private appendPrivateFile(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
  }

  private readJson(filePath: string): unknown {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`vault: invalid JSON in ${filePath}: ${detail}`);
    }
  }

  isInitialized(): boolean {
    return fs.existsSync(this.manifestPath);
  }

  /** Idempotent. Returns { created: boolean } so the CLI can report accurately. */
  init(): { created: boolean; manifest: Manifest } {
    if (this.isInitialized()) {
      this.hardenPermissions();
      return { created: false, manifest: this.loadManifest() };
    }

    this.ensureDirectory(this.root);
    this.ensureDirectory(this.cardsDir);
    this.ensureDirectory(this.handoffsDir);
    if (!fs.existsSync(this.receiptsPath)) {
      this.writePrivateFile(this.receiptsPath, "");
    }
    if (!fs.existsSync(this.revocationsPath)) {
      this.writePrivateFile(this.revocationsPath, "");
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
    return validateManifest(this.readJson(this.manifestPath), this.manifestPath);
  }

  saveManifest(manifest: Manifest): void {
    validateManifest(manifest, "manifest");
    this.ensureDirectory(this.root);
    this.writePrivateFile(this.manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  loadConfig(): VaultConfig {
    if (!fs.existsSync(this.configPath)) return { ...DEFAULT_CONFIG };
    return validateVaultConfig(this.readJson(this.configPath), this.configPath);
  }

  saveConfig(config: VaultConfig): void {
    validateVaultConfig(config, "config");
    this.writePrivateFile(this.configPath, JSON.stringify(config, null, 2) + "\n");
  }

  hardenPermissions(): void {
    if (!fs.existsSync(this.root)) return;
    this.ensureDirectory(this.root);
    for (const dir of [this.cardsDir, this.handoffsDir]) {
      if (fs.existsSync(dir)) this.ensureDirectory(dir);
    }
    const stack = [this.root];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          fs.chmodSync(fullPath, 0o700);
          stack.push(fullPath);
        } else if (entry.isFile()) {
          fs.chmodSync(fullPath, 0o600);
        }
      }
    }
  }

  // --- cards -------------------------------------------------------------

  saveCard(card: Card): void {
    this.assertInitialized();
    const validated = validateCard(card, `card:${card.kind}`);
    const dir = path.join(this.cardsDir, card.kind);
    this.ensureDirectory(dir);
    this.writePrivateFile(
      path.join(dir, `${validated.id}.json`),
      JSON.stringify(validated, null, 2) + "\n"
    );
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
        const filePath = path.join(dir, file);
        const card = validateCard(this.readJson(filePath), filePath);
        if (card.kind !== k || file !== `${card.id}.json`) {
          throw new Error(`${filePath}: storage path does not match card kind/id`);
        }
        cards.push(card);
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

  revokeCard(id: string, reason?: string): RevocationRecord | undefined {
    const card = this.findCard(id);
    if (!card) return undefined;
    const record = this.createRevocation("card_revocation", card.id, card.kind, reason);
    this.appendRevocation(record);
    this.deleteCard(id);
    return record;
  }

  // --- handoffs ------------------------------------------------------------

  saveHandoff(handoff: HandoffCard): void {
    this.assertInitialized();
    const validated = validateHandoff(handoff, "handoff");
    this.ensureDirectory(this.handoffsDir);
    this.writePrivateFile(
      path.join(this.handoffsDir, `${validated.id}.json`),
      JSON.stringify(validated, null, 2) + "\n"
    );
  }

  listHandoffs(): HandoffCard[] {
    this.assertInitialized();
    if (!fs.existsSync(this.handoffsDir)) return [];
    return fs
      .readdirSync(this.handoffsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const filePath = path.join(this.handoffsDir, f);
        const handoff = validateHandoff(this.readJson(filePath), filePath);
        if (f !== `${handoff.id}.json`) {
          throw new Error(`${filePath}: storage filename does not match handoff id`);
        }
        return handoff;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  findHandoff(id: string): HandoffCard | undefined {
    return this.listHandoffs().find((h) => h.id === id);
  }

  revokeHandoff(id: string, reason?: string): RevocationRecord | undefined {
    const handoff = this.findHandoff(id);
    if (!handoff) return undefined;
    const record = this.createRevocation(
      "handoff_revocation",
      handoff.id,
      handoff.kind,
      reason
    );
    this.appendRevocation(record);
    fs.unlinkSync(path.join(this.handoffsDir, `${handoff.id}.json`));
    return record;
  }

  // --- receipts ------------------------------------------------------------

  appendReceipt(receipt: TrustReceipt): void {
    this.assertInitialized();
    validateReceipt(receipt, "receipt");
    this.appendPrivateFile(this.receiptsPath, JSON.stringify(receipt) + "\n");
  }

  listReceipts(): TrustReceipt[] {
    this.assertInitialized();
    if (!fs.existsSync(this.receiptsPath)) return [];
    return fs
      .readFileSync(this.receiptsPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, index) => {
        try {
          return validateReceipt(JSON.parse(line), `${this.receiptsPath}:${index + 1}`);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`vault: invalid receipt at ${this.receiptsPath}:${index + 1}: ${detail}`);
        }
      });
  }

  private createRevocation(
    kind: RevocationRecord["kind"],
    artifactId: string,
    artifactKind: string,
    reason?: string
  ): RevocationRecord {
    return {
      id: `rev_${randomBytes(8).toString("hex")}`,
      kind,
      artifact_id: artifactId,
      artifact_kind: artifactKind,
      reason: reason?.trim() || undefined,
      revoked_at: new Date().toISOString(),
    };
  }

  private appendRevocation(record: RevocationRecord): void {
    const validated = validateRevocation(record, "revocation");
    this.appendPrivateFile(this.revocationsPath, JSON.stringify(validated) + "\n");
  }

  listRevocations(): RevocationRecord[] {
    this.assertInitialized();
    if (!fs.existsSync(this.revocationsPath)) return [];
    return fs
      .readFileSync(this.revocationsPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, index) => {
        try {
          return validateRevocation(
            JSON.parse(line),
            `${this.revocationsPath}:${index + 1}`
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`vault: invalid revocation at ${this.revocationsPath}:${index + 1}: ${detail}`);
        }
      });
  }
}
