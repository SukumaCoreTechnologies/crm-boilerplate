import { Request, Response, NextFunction } from "express";

export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type PermissionScope = 
  | "contacts:read" 
  | "contacts:write" 
  | "contacts:delete"
  | "deals:read" 
  | "deals:write" 
  | "deals:delete";

const ROLE_PERMISSIONS: Record<Role, PermissionScope[]> = {
  ADMIN: [
    "contacts:read", "contacts:write", "contacts:delete",
    "deals:read", "deals:write", "deals:delete"
  ],
  MANAGER: [
    "contacts:read", "contacts:write",
    "deals:read", "deals:write"
  ],
  AGENT: [
    "contacts:read",
    "deals:read"
  ],
};

export interface AuthenticatedRequest extends Request {
  userRole?: Role;
  userScopes?: PermissionScope[];
}

/**
 * Middleware to simulate user authentication & scope resolution from headers
 */
export function authenticateRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const roleHeader = (req.headers["x-user-role"] as Role) || "AGENT";
  
  if (!ROLE_PERMISSIONS[roleHeader]) {
    return res.status(400).json({ error: "Invalid x-user-role header provided." });
  }

  req.userRole = roleHeader;
  req.userScopes = ROLE_PERMISSIONS[roleHeader];
  next();
}

/**
 * Middleware factory to enforce required permission scopes on routes
 */
export function requireScope(requiredScope: PermissionScope) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userScopes || !req.userScopes.includes(requiredScope)) {
      return res.status(403).json({ 
        error: "Forbidden: Insufficient permissions",
        requiredScope,
        assignedRole: req.userRole || "UNKNOWN"
      });
    }
    next();
  };
}
