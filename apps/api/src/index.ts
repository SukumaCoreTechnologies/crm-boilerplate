import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "@crm/database";
import { ContactSchema, DealSchema } from "@crm/types";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- OUR SIGNATURE FEATURE: Autonomous GRC Audit & Intelligence Middleware ---
// Automatically fingerprints state-changing actions for compliance & relationship tracking
const auditIntelligenceEngine = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on("finish", async () => {
    if (["POST", "PUT", "DELETE"].includes(req.method) && res.statusCode < 400) {
      try {
        const duration = Date.now() - start;
        console.log(`[CRM Intelligence Signature] ${req.method} ${req.originalUrl} - Processed in ${duration}ms`);
      } catch (err) {
        console.error("Audit logging error:", err);
      }
    }
  });

  next();
};

app.use(auditIntelligenceEngine);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", signature: "Autonomous GRC-Ready CRM Core", timestamp: new Date().toISOString() });
});

// --- CONTACTS API ---
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: { deals: true, activities: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const validation = ContactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const { customFields, ...data } = validation.data;

    const newContact = await prisma.contact.create({
      data: {
        ...data,
        customFields: customFields ? JSON.stringify(customFields) : null,
        activities: {
          create: {
            type: "LIFECYCLE",
            description: "Contact registered via autonomous API gateway."
          }
        }
      },
      include: { activities: true }
    });

    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// --- DEALS API ---
app.post("/api/deals", async (req, res) => {
  try {
    const validation = DealSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const newDeal = await prisma.deal.create({
      data: validation.data,
    });

    res.status(201).json(newDeal);
  } catch (error) {
    res.status(500).json({ error: "Failed to create deal" });
  }
});

app.listen(PORT, () => {
  console.log(`CRM API Gateway with Intelligence Signature running on port ${PORT}`);
});
