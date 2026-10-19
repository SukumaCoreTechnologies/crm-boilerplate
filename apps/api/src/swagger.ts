import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { ContactSchema, DealSchema } from "@crm/types";

export const registry = new OpenAPIRegistry();

// Register Bearer & License Key Security Schemes
registry.registerComponent("securitySchemes", "LicenseKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "x-license-key",
  description: "Enterprise License Key required to decrypt sensitive PII fields.",
});

// Register Schemas
registry.register("Contact", ContactSchema);
registry.register("Deal", DealSchema);

// Register Endpoints
registry.registerPath({
  method: "get",
  path: "/api/contacts",
  summary: "Fetch all CRM contacts",
  description: "Returns all contacts. Sensitive fields are masked unless a valid Premium License Key header is supplied.",
  security: [{ LicenseKeyAuth: [] }],
  responses: {
    200: {
      description: "List of contacts retrieved successfully",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contacts",
  summary: "Create a new contact",
  description: "Encrypts sensitive phone numbers using AES-256 before writing to storage.",
  request: {
    content: {
      "application/json": {
        schema: ContactSchema,
      },
    },
  },
  responses: {
    201: {
      description: "Contact created with field-level encryption",
    },
  },
});

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Modular CRM Enterprise API Core",
      description: "Future-proof CRM API Gateway equipped with IBM SIEM logging and AES-256 field-level encryption.",
    },
    servers: [{ url: "http://localhost:4000" }],
  });
}
