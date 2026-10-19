import { z } from "zod";

// Contact Validation Schema with Dynamic Custom Fields support
export const ContactSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]).default("LEAD"),
  customFields: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Contact = z.infer<typeof ContactSchema>;

// Deal / Pipeline Stage Validation Schema
export const DealSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Deal title is required"),
  value: z.number().nonnegative("Value must be a positive number"),
  stage: z.enum(["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]),
  contactId: z.string().uuid(),
  createdAt: z.date().optional(),
});

export type Deal = z.infer<typeof DealSchema>;
