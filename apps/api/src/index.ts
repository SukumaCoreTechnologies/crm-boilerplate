import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { prisma } from "@crm/database";
import { ContactSchema } from "@crm/types";
import { isPremiumLicenseActive, encryptValue, decryptValue, logQRadarEvent } from "./security.js";
import { generateOpenAPIDocument } from "./swagger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MASTER_ENCRYPTION_KEY = process.env.JWT_SECRET || "fallback-master-key-32-chars-long";

app.use(cors());
app.use(express.json());

// --- INTERACTIVE OPENAPI / SWAGGER DOCUMENTATION ---
const openApiDoc = generateOpenAPIDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    signature: "Autonomous GRC-Ready CRM Core", 
    docs: `http://localhost:${PORT}/api-docs`,
    timestamp: new Date().toISOString() 
  });
});

// --- CONTACTS API ---
app.get("/api/contacts", async (req: Request, res: Response) => {
  try {
    const licenseKey = req.headers["x-license-key"] as string;
    const hasPremium = isPremiumLicenseActive(licenseKey);

    logQRadarEvent("READ_CONTACTS", "/api/contacts", "LOW", req);

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    const processedContacts = contacts.map((c) => ({
      ...c,
      phone: c.phone
        ? hasPremium
          ? decryptValue(c.phone, MASTER_ENCRYPTION_KEY)
          : "[LOCKED - ENTERPRISE LICENSE REQUIRED]"
        : null,
      isEncrypted: !hasPremium,
    }));

    res.json({
      data: processedContacts,
      security: {
        ibmSiemStatus: "ACTIVE",
        fieldLevelEncryption: hasPremium ? "UNLOCKED" : "ENCRYPTED_RESTRICTED",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

app.post("/api/contacts", async (req: Request, res: Response) => {
  try {
    const validation = ContactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const { phone, customFields, ...data } = validation.data;
    const encryptedPhone = phone ? encryptValue(phone, MASTER_ENCRYPTION_KEY) : null;

    logQRadarEvent("CREATE_CONTACT", "/api/contacts", "MEDIUM", req);

    const newContact = await prisma.contact.create({
      data: {
        ...data,
        phone: encryptedPhone,
        customFields: customFields ? JSON.stringify(customFields) : null,
      },
    });

    res.status(201).json({
      ...newContact,
      message: "Contact stored with AES-256 field-level encryption at rest.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// Return to repository root
cd ../..
