/**
 * Local-only candidate 0.3 construction.
 *
 * This module can shape a bounded continuity deposit, but it cannot transmit
 * one. The caller must supply a healthy Contract Doctor report before any
 * candidate is built.
 */
import { createHash } from "crypto";
import type { Card } from "./cards";
import type { HandoffCard } from "./handoff";

export const EXPECTED_QUARK_CONTRACT_ID =
  "sha256:6f1418e508abbd4e4d4329ef20a6ba6bc972dc0dbca132b299136106291545d9";

export interface ContractDoctorReport {
  schema_version: "0.1";
  kind: "continuity_contract_doctor_report";
  role: "producer";
  status: "healthy" | "drift";
  contract_id: string;
  fixture_version: string;
  manifest_schema_version: string;
  payload_schema_version: string;
  payload_sha256: string;
  canonical_artifact_hash: string;
  artifact_size_bytes: number;
  network_authorized: boolean;
  checks: Record<string, boolean>;
}

export interface QuarkCandidatePolicy {
  authority: false;
  memory_authority: false;
  decision_authority: false;
  activation_allowed: false;
  raw_conversation_included: false;
  user_approved_projection_included: true;
  revocable: true;
  fossil_derivation_allowed: false;
  semantic_indexing_allowed: false;
}

export interface QuarkCandidateDeposit {
  schema_version: "0.3";
  kind: "continuity_deposit";
  source: "doppelganger";
  payload_kind: "handoff_card" | "fossil_trace";
  projection: {
    artifact: HandoffCard | Card;
    content_hash: string;
    artifact_size_bytes: number;
  };
  policy: QuarkCandidatePolicy;
  consent: {
    mode: "explicit_cli_confirm";
    confirmed_at: string;
    projection_hash: string;
  };
  receipt_policy: {
    local_receipt_required: true;
    server_receipt_required: true;
    deletion_receipt_required: true;
    expiry_receipt_required: true;
  };
  retention_requested_days: number;
}

export interface QuarkCandidateDryRunManifest {
  schema_version: "0.1";
  kind: "quark_candidate_dry_run_manifest";
  contract_id: string;
  fixture_version: string;
  payload_schema_version: "0.3";
  payload_kind: "handoff_card" | "fossil_trace";
  artifact_content_hash: string;
  artifact_size_bytes: number;
  candidate_sha256: string;
  network_authorized: false;
  transport: {
    http_client_present: false;
    endpoint_configured: false;
    credential_included: false;
    sent: false;
  };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new Error("quark candidate: floating-point values are not supported");
  }
  return JSON.stringify(value);
}

function sha256Bytes(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function canonicalHash(value: unknown): string {
  return sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

export function assertDoctorAllowsCandidateBuild(
  report: ContractDoctorReport
): void {
  if (
    report.kind !== "continuity_contract_doctor_report" ||
    report.role !== "producer"
  ) {
    throw new Error("quark candidate: Contract Doctor returned an unexpected report");
  }
  if (report.status !== "healthy" || !Object.values(report.checks).every(Boolean)) {
    throw new Error("quark candidate: refusing build because Contract Doctor reports drift");
  }
  if (report.network_authorized !== false) {
    throw new Error(
      "quark candidate: refusing build because network_authorized must remain false"
    );
  }
  if (report.contract_id !== EXPECTED_QUARK_CONTRACT_ID) {
    throw new Error(
      `quark candidate: refusing unknown contract ID ${report.contract_id}`
    );
  }
  if (report.payload_schema_version !== "0.3") {
    throw new Error(
      `quark candidate: refusing payload schema ${report.payload_schema_version}`
    );
  }
}

export function buildQuarkCandidate(
  artifact: HandoffCard | Card,
  payloadKind: "handoff_card" | "fossil_trace",
  doctor: ContractDoctorReport,
  options: { confirmedAt?: string; retentionDays?: number } = {}
): {
  candidate: QuarkCandidateDeposit;
  manifest: QuarkCandidateDryRunManifest;
} {
  assertDoctorAllowsCandidateBuild(doctor);
  if (payloadKind === "handoff_card" && artifact.kind !== "handoff_card") {
    throw new Error("quark candidate: handoff payload requires a handoff_card");
  }
  if (payloadKind === "fossil_trace" && artifact.kind !== "fossil_trace") {
    throw new Error("quark candidate: fossil payload requires a fossil_trace");
  }

  const retentionDays = options.retentionDays ?? 30;
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 30) {
    throw new Error("quark candidate: retention days must be an integer from 1 to 30");
  }
  const confirmedAt = options.confirmedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(confirmedAt))) {
    throw new Error("quark candidate: confirmed_at must be an ISO date-time");
  }

  const canonicalArtifact = Buffer.from(canonicalJson(artifact), "utf8");
  if (canonicalArtifact.length < 1 || canonicalArtifact.length > 16_384) {
    throw new Error(
      `quark candidate: artifact must be 1-16384 bytes (got ${canonicalArtifact.length})`
    );
  }
  const contentHash = sha256Bytes(canonicalArtifact);
  const candidate: QuarkCandidateDeposit = {
    schema_version: "0.3",
    kind: "continuity_deposit",
    source: "doppelganger",
    payload_kind: payloadKind,
    projection: {
      artifact,
      content_hash: contentHash,
      artifact_size_bytes: canonicalArtifact.length,
    },
    policy: {
      authority: false,
      memory_authority: false,
      decision_authority: false,
      activation_allowed: false,
      raw_conversation_included: false,
      user_approved_projection_included: true,
      revocable: true,
      fossil_derivation_allowed: false,
      semantic_indexing_allowed: false,
    },
    consent: {
      mode: "explicit_cli_confirm",
      confirmed_at: confirmedAt,
      projection_hash: contentHash,
    },
    receipt_policy: {
      local_receipt_required: true,
      server_receipt_required: true,
      deletion_receipt_required: true,
      expiry_receipt_required: true,
    },
    retention_requested_days: retentionDays,
  };
  const candidateBytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  const manifest: QuarkCandidateDryRunManifest = {
    schema_version: "0.1",
    kind: "quark_candidate_dry_run_manifest",
    contract_id: doctor.contract_id,
    fixture_version: doctor.fixture_version,
    payload_schema_version: "0.3",
    payload_kind: payloadKind,
    artifact_content_hash: contentHash,
    artifact_size_bytes: canonicalArtifact.length,
    candidate_sha256: sha256Bytes(candidateBytes),
    network_authorized: false,
    transport: {
      http_client_present: false,
      endpoint_configured: false,
      credential_included: false,
      sent: false,
    },
  };
  return { candidate, manifest };
}
