/**
 * Samanvay AICTE Grievance Portal
 * Role-Based Access Control (RBAC) Permission Matrix
 * Statutory Compliance: AICTE Grievance Regulations & DPDP Act 2023
 */

import { Role } from "@/lib/mock";

export type Permission =
  | "complaint:read"             // Read complaints within scope
  | "complaint:read_all"         // Read all complaints across all bureaus (unscoped)
  | "complaint:write"            // File new complaint or edit draft
  | "complaint:transition"       // Transition grievance workflow stage
  | "complaint:merge"            // Merge duplicate complaints into master docket
  | "complaint:unmerge"          // Unmerge child complaints
  | "complaint:reassign"         // Manually reassign case officer
  | "complaint:withdraw"         // Complainant grievance withdrawal
  | "complaint:extend"           // Request deadline extension for show-cause notice
  | "complaint:respond"          // Submit institutional response or compliance proof
  | "identity:reveal"            // Reveal unmasked complainant PII (Requires justification)
  | "privacy:erase"              // Execute DPDP Section 12 Right-To-Be-Forgotten erasure
  | "audit:read"                 // View audit trail logs
  | "audit:verify"               // Cryptographically verify hash-chained audit trail
  | "workflow:configure"         // Modify stage definitions, SLA rules, escalation paths
  | "mfa:manage"                 // Configure, enable, or reset TOTP Multi-Factor Authentication
  | "task:assign"                // Assign inter-bureau task with deadline
  | "conflict:resolve"           // Adjudicate cross-bureau conflicting decisions
  | "showcause:issue"            // Issue statutory show-cause notice
  | "penalty:impose";            // Impose regulatory sanctions or withdraw AICTE approval

/**
 * Granular Role Permission Matrix
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  Admin: [
    "complaint:read",
    "complaint:read_all",
    "complaint:write",
    "complaint:transition",
    "complaint:merge",
    "complaint:unmerge",
    "complaint:reassign",
    "complaint:withdraw",
    "identity:reveal",
    "privacy:erase",
    "audit:read",
    "audit:verify",
    "workflow:configure",
    "mfa:manage",
    "task:assign",
    "conflict:resolve",
    "showcause:issue",
    "penalty:impose",
  ],
  Chairperson: [
    "complaint:read",
    "complaint:read_all",
    "complaint:transition",
    "complaint:merge",
    "complaint:unmerge",
    "complaint:reassign",
    "identity:reveal",
    "audit:read",
    "audit:verify",
    "mfa:manage",
    "task:assign",
    "conflict:resolve",
    "showcause:issue",
    "penalty:impose",
  ],
  "RB Officer": [
    "complaint:read",
    "complaint:transition",
    "complaint:merge",
    "complaint:reassign",
    "audit:read",
    "audit:verify",
    "mfa:manage",
    "task:assign",
    "showcause:issue",
  ],
  "PGRC Officer": [
    "complaint:read",
    "complaint:transition",
    "complaint:merge",
    "complaint:reassign",
    "audit:read",
    "audit:verify",
    "mfa:manage",
    "task:assign",
    "showcause:issue",
  ],
  Institute: [
    "complaint:read",
    "complaint:extend",
    "complaint:respond",
    "mfa:manage",
  ],
  Complainant: [
    "complaint:read",
    "complaint:write",
    "complaint:withdraw",
    "privacy:erase",
  ],
} as const;

/**
 * Check if a given role has a specific statutory permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return Boolean(allowed && allowed.includes(permission));
}

/**
 * Get all permissions granted to a role
 */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validates request authorization from HTTP request headers or session body
 */
export interface AuthContext {
  role: Role;
  userId?: string;
  instituteId?: string;
}

export function extractAuthContext(req: Request, fallbackBody?: any): AuthContext {
  // Extract role from custom header, standard header, or fallback body
  const headerRole = req.headers.get("x-user-role") || req.headers.get("X-User-Role");
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("X-User-Id");
  const headerInstId = req.headers.get("x-institute-id") || req.headers.get("X-Institute-Id");

  const validRoles: Role[] = ["Admin", "RB Officer", "PGRC Officer", "Chairperson", "Institute", "Complainant"];

  let role: Role = "Complainant"; // Safe default
  if (headerRole && validRoles.includes(headerRole as Role)) {
    role = headerRole as Role;
  } else if (fallbackBody?.role && validRoles.includes(fallbackBody.role as Role)) {
    role = fallbackBody.role as Role;
  }

  const userId = headerUserId || fallbackBody?.userId || fallbackBody?.user_id || "anonymous-actor";
  const instituteId = headerInstId || fallbackBody?.instituteId || fallbackBody?.institute_id;

  return { role, userId, instituteId };
}

/**
 * Guard function for API routes. Returns an error response if unauthorized, or null if authorized.
 */
export function authorizePermission(
  auth: AuthContext,
  requiredPermission: Permission
): { authorized: boolean; reason?: string } {
  if (!hasPermission(auth.role, requiredPermission)) {
    return {
      authorized: false,
      reason: `Access Denied: Role '${auth.role}' does not possess required statutory permission '${requiredPermission}'.`,
    };
  }
  return { authorized: true };
}
