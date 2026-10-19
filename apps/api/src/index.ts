import express, { Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { prisma } from "@crm/database";
import { ContactSchema } from "@crm/types";
import { isPremiumLicenseActive, encryptValue, decryptValue, logQRadarEvent } from "./security.js";
import { generateOpenAPIDocument } from "./swagger.js";
import { authenticateRole, requireScope, AuthenticatedRequest } from "./rbac.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MASTER_ENCRYPTION_KEY = process.env.JWT_SECRET || "fallback-master-key-32-chars-long";

app.use(cors());
app.use(express.json());

// Apply role resolution across incoming requests
app.use(authenticateRole as express.RequestHandler);

// OpenAPI Swagger Docs
const openApiDoc = generateOpenAPIDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    signature: "Autonomous GRC & RBAC Enabled CRM Core", 
    docs: `http://localhost:${PORT}/api-docs`,
    timestamp: new Date().toISOString() 
  });
});

// --- CONTACTS API WITH RBAC SCOPE PROTECTION ---
app.get("/api/contacts", requireScope("contacts:read") as express.RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
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
        role: req.userRole,
        ibmSiemStatus: "ACTIVE",
        fieldLevelEncryption: hasPremium ? "UNLOCKED" : "ENCRYPTED_RESTRICTED",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

app.post("/api/contacts", requireScope("contacts:write") as express.RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
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

app.listen(PORT, () => {
  console.log(`CRM API Gateway running with RBAC & Security Layer on port ${PORT}`);
});
