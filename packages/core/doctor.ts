import * as fs from "fs";
import * as path from "path";
import { Vault } from "./vault";
import {
  assertCardInvariants,
  assertContinuityEnvelope,
  assertHandoffInvariants,
  PolicyViolationError,
} from "./policy";

export type DoctorState = "ok" | "warning" | "error";

export interface DoctorCheck {
  label: string;
  value: string;
  state: DoctorState;
}

export interface DoctorReport {
  healthy: boolean;
  checks: DoctorCheck[];
}

function permissionText(label: string, filePath: string, expected: number): DoctorCheck {
  if (process.platform === "win32") {
    return { label, value: "not applicable on Windows", state: "warning" };
  }
  const actual = fs.statSync(filePath).mode & 0o777;
  return {
    label,
    value: actual === expected ? `${expected.toString(8)} (private)` : `${actual.toString(8)} (expected ${expected.toString(8)})`,
    state: actual === expected ? "ok" : "error",
  };
}

function policySelfTest(): boolean {
  const mustReject = (probe: () => void): boolean => {
    try {
      probe();
      return false;
    } catch (error) {
      return error instanceof PolicyViolationError;
    }
  };
  return [
    mustReject(() =>
      assertCardInvariants(
        {
          kind: "memory_card",
          label: "doctor probe",
          authority: true,
          revocable: true,
        },
        "doctor card self-test"
      )
    ),
    mustReject(() =>
      assertHandoffInvariants(
        {
          usable_as: "context_only",
          decisions: [{ authority: true }],
        },
        "doctor handoff self-test"
      )
    ),
    mustReject(() =>
      assertContinuityEnvelope(
        {
          authority: true,
          memory_authority: false,
          decision_authority: false,
          activation_allowed: false,
          raw_conversation_included: false,
          card_content_included: false,
          revocable: true,
          source: "doppelganger",
        },
        "doctor envelope self-test"
      )
    ),
  ].every(Boolean);
}

export function runDoctor(vault = new Vault()): DoctorReport {
  if (!vault.isInitialized()) {
    const policyActive = policySelfTest();
    return {
      healthy: false,
      checks: [
        { label: "Vault found", value: "no — run \"doppel init\" in this directory", state: "error" },
        { label: "Network", value: "disabled by design", state: "ok" },
        { label: "Quark adapter", value: "dry-run only", state: "ok" },
        {
          label: "Policy chokepoint",
          value: policyActive ? "active" : "self-test failed",
          state: policyActive ? "ok" : "error",
        },
      ],
    };
  }

  const checks: DoctorCheck[] = [];
  try {
    const manifest = vault.loadManifest();
    const config = vault.loadConfig();
    const cards = vault.listCards();
    const handoffs = vault.listHandoffs();
    const receipts = vault.listReceipts();
    const revocations = vault.listRevocations();

    checks.push({ label: "Vault found", value: "yes", state: "ok" });
    checks.push({ label: "Vault integrity", value: `valid (${manifest.schema_version})`, state: "ok" });
    checks.push(permissionText("Vault directory permissions", vault.root, 0o700));
    checks.push(
      permissionText(
        "Vault file permissions",
        path.join(vault.root, "manifest.json"),
        0o600
      )
    );
    checks.push({ label: "Cards", value: String(cards.length), state: "ok" });
    checks.push({
      label: "Boundary cards",
      value: String(cards.filter((card) => card.kind === "boundary_card").length),
      state: "ok",
    });
    checks.push({ label: "Handoffs", value: String(handoffs.length), state: "ok" });
    checks.push({ label: "Receipts", value: String(receipts.length), state: "ok" });
    checks.push({ label: "Revocations", value: String(revocations.length), state: "ok" });
    checks.push({
      label: "Network",
      value:
        config.mode === "local-only" && config.quark_sync === "disabled"
          ? "disabled"
          : "configuration permits external sync",
      state:
        config.mode === "local-only" && config.quark_sync === "disabled" ? "ok" : "error",
    });
    checks.push({ label: "Quark adapter", value: "dry-run only", state: "ok" });
    const policyActive = policySelfTest();
    checks.push({
      label: "Policy chokepoint",
      value: policyActive ? "active" : "self-test failed",
      state: policyActive ? "ok" : "error",
    });

    const receiptsPath = path.join(vault.root, "receipts.jsonl");
    checks.push({
      label: "Receipt ledger",
      value: fs.existsSync(receiptsPath) ? "readable" : "missing",
      state: fs.existsSync(receiptsPath) ? "ok" : "error",
    });
  } catch (error) {
    checks.push({
      label: "Vault integrity",
      value: error instanceof Error ? error.message : String(error),
      state: "error",
    });
  }

  return {
    healthy: checks.every((check) => check.state !== "error"),
    checks,
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines = ["Doppelganger Doctor", ""];
  for (const check of report.checks) {
    const marker = check.state === "ok" ? "OK" : check.state === "warning" ? "WARN" : "ERROR";
    lines.push(`[${marker}] ${check.label}: ${check.value}`);
  }
  lines.push("");
  lines.push(`Overall: ${report.healthy ? "healthy" : "attention required"}`);
  lines.push("");
  return lines.join("\n");
}
