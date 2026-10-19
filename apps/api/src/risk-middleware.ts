import { Request, Response, NextFunction } from "express";
import { evaluateDataPrivacyCompliance, generateSecureAuditBlock } from "@crm/risk-engine";
import { logQRadarEvent } from "./security.js";

let lastKnownAuditHash = "0000000000000000000000000000000000000000000000000000000000000000";

export function enforceRiskAndCompliance(req: Request, res: Response, next: NextFunction) {
  if (req.method === "POST" && req.path.includes("/contacts")) {
    const { consentGiven, email } = req.body;

    // 1. Evaluate Data Privacy / Consent
    const complianceCheck = evaluateDataPrivacyCompliance({ email, consentGiven: consentGiven === true });
    if (!complianceCheck.compliant) {
      logQRadarEvent("COMPLIANCE_VIOLATION_BLOCKED", req.originalUrl, "HIGH", req);
      return res.status(403).json({
        error: "Risk Management Block",
        details: complianceCheck.reason,
      });
    }

    // 2. Generate Hash-Chained Audit Fingerprint
    const { currentHash, entry } = generateSecureAuditBlock(
      lastKnownAuditHash, 
      "CREATE_CANDIDATE_RISK_CHECK", 
      req.headers["x-user-id"]?.toString() || "system-bot", 
      req.body
    );
    
    lastKnownAuditHash = currentHash;
    
    // Attach immutable audit block to request for downstream logging
    (req as any).secureAuditEntry = entry;
    (req as any).auditHash = currentHash;
  }

  next();
}
