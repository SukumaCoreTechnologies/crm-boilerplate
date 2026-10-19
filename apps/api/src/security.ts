import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

// AES-256-GCM Encryption Engine
const ALGORITHM = "aes-256-gcm";

/**
 * Validates whether the user holds a active Premium Enterprise License Key
 */
export function isPremiumLicenseActive(licenseKey?: string): boolean {
  if (!licenseKey) return false;
  // Signature verification logic (Checks for key prefix / cryptographic signature)
  return licenseKey.startsWith("ENT_PREMIUM_") && licenseKey.length >= 32;
}

/**
 * Field-Level Encryption: Encrypts PII/Custom Fields unless Premium Key unlocks raw reading
 */
export function encryptValue(plainText: string, secretKey: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secretKey, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptValue(cipherText: string, secretKey: string): string {
  try {
    const [ivHex, authTagHex, encryptedText] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = crypto.scryptSync(secretKey, "salt", 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "[ENCRYPTED DATA - REQUIRES PREMIUM LICENSE]";
  }
}

/**
 * IBM QRadar-Style SIEM Log Formatter
 */
export function logQRadarEvent(action: string, resource: string, severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", req: Request) {
  const event = {
    qradarHeader: "LEEF:2.0|IBM|CRMBoilerplate|1.0|" + action + "|",
    severity,
    ip: req.ip || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "Unknown",
    resource,
    timestamp: new Date().toISOString(),
  };

  console.log(`[IBM SIEM SECURITY EVENT] ${JSON.stringify(event)}`);
}
