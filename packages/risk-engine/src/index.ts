import crypto from "crypto";

export interface AuditLogEntry {
  previousHash: string;
  action: string;
  actorId: string;
  timestamp: string;
  payloadHash: string;
}

/**
 * Creates an immutable, hash-chained audit signature to prevent log tampering.
 * Satisfies strict GRC compliance and data protection mandates.
 */
export function generateSecureAuditBlock(previousHash: string, action: string, actorId: string, data: any): { currentHash: string; entry: AuditLogEntry } {
  const timestamp = new Date().toISOString();
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  
  const rawString = `${previousHash}:${action}:${actorId}:${timestamp}:${payloadHash}`;
  const currentHash = crypto.createHash("sha256").update(rawString).digest("hex");

  return {
    currentHash,
    entry: {
      previousHash,
      action,
      actorId,
      timestamp,
      payloadHash,
    },
  };
}

/**
 * Validates candidate data against local Data Protection Acts (e.g., explicit consent flags)
 */
export function evaluateDataPrivacyCompliance(candidatePayload: { email: string; phone?: string; consentGiven: boolean }): { compliant: boolean; reason?: string } {
  if (!candidatePayload.consentGiven) {
    return {
      compliant: false,
      reason: "Data Privacy Violation: Candidate did not provide explicit consent for automated processing under regional data protection laws.",
    };
  }
  return { compliant: true };
}
