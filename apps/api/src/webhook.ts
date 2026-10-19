import { Request, Response } from "express";
import { prisma } from "@crm/database";
import { logQRadarEvent } from "./security.js";

/**
 * Zero-Touch Ingestion Webhook Listener
 * Automatically ingests contact updates or incoming communication notes
 */
export async function handleContactWebhook(req: Request, res: Response) {
  try {
    const signatureHeader = req.headers["x-webhook-signature"];
    
    // Basic webhook authentication guard
    if (!signatureHeader || signatureHeader !== "crm_secret_webhook_token") {
      logQRadarEvent("WEBHOOK_UNAUTHORIZED", "/api/webhooks/contacts", "HIGH", req);
      return res.status(401).json({ error: "Unauthorized webhook signature." });
    }

    const { email, firstName, lastName, phone, activityType, activityDescription } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required for webhook ingestion." });
    }

    logQRadarEvent("WEBHOOK_INGESTION_SUCCESS", "/api/webhooks/contacts", "LOW", req);

    // Upsert contact: Find by email or create new
    const contact = await prisma.contact.upsert({
      where: { email },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
      },
      create: {
        email,
        firstName: firstName || "Unknown",
        lastName: lastName || "Lead",
        phone: phone || null,
        status: "LEAD",
      },
    });

    // If an activity was provided in the webhook payload, log it automatically
    if (activityType && activityDescription) {
      await prisma.activity.create({
        data: {
          contactId: contact.id,
          type: activityType,
          description: activityDescription,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Automated ingestion successful.",
      contactId: contact.id,
    });
  } catch (error) {
    console.error("Webhook ingestion error:", error);
    return res.status(500).json({ error: "Internal server error during webhook ingestion." });
  }
}
