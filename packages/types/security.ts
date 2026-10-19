import { z } from "zod";

export const SecurityEventSchema = z.object({
  eventId: z.string().uuid(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  action: z.string(),
  actorId: z.string().optional(),
  resource: z.string(),
  ipAddress: z.string().optional(),
  timestamp: z.string(),
  signature: z.string(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
