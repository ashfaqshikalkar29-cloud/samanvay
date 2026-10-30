// ==============================================================================
// SAMANVAY: Configurable Workflow Case Engine (A. Workflow Management)
// Runtime execution, transition guards, required field enforcement & approvals
// ==============================================================================

import { Role, Complaint, Bureau } from "../mock";
import { CategoryWorkflow, WorkflowStage, WorkflowTransition, TransitionExecutionResult } from "./types";

// Standard statutory workflow definitions for all AICTE grievance categories
export const DEFAULT_CATEGORY_WORKFLOWS: CategoryWorkflow[] = [
  {
    id: "wf-fee-regulation",
    category: "Fee Regulation",
    bureau: "RB",
    description: "Standard statutory workflow for fee overcharging, capitation fees, and refund disputes.",
    stages: ["Intake", "Scrutiny", "Show-Cause", "Hearing", "Compliance", "Disposed", "Appeal"],
    initialStage: "Scrutiny",
    defaultSlaDays: {
      Intake: 1,
      Scrutiny: 3,
      "Show-Cause": 15,
      Hearing: 7,
      Compliance: 14,
      Disposed: 0,
      Appeal: 21,
    },
    version: 1,
    updated_at: "2026-10-24T00:00:00Z",
    is_active: true,
    transitions: [
      { from: "Intake", to: "Scrutiny", allowedRoles: ["Admin", "RB Officer"], label: "Commence Initial Scrutiny" },
      { from: "Scrutiny", to: "Show-Cause", allowedRoles: ["Admin", "RB Officer"], label: "Issue Show-Cause Notice", requiredFields: ["next_action"] },
      { from: "Scrutiny", to: "Compliance", allowedRoles: ["Admin", "RB Officer"], label: "Direct Compliance & Refund" },
      { from: "Show-Cause", to: "Hearing", allowedRoles: ["Admin", "RB Officer"], label: "Schedule Formal Hearing" },
      { from: "Show-Cause", to: "Compliance", allowedRoles: ["Admin", "RB Officer"], label: "Accept Reply & Order Compliance" },
      { from: "Hearing", to: "Compliance", allowedRoles: ["Admin", "RB Officer", "Chairperson"], label: "Record Hearing Outcome Order" },
      { from: "Compliance", to: "Disposed", allowedRoles: ["Admin", "RB Officer", "Chairperson"], label: "Verify Compliance & Dispose Docket", requiresApproval: true, approvalRole: "Chairperson" },
      { from: "Disposed", to: "Appeal", allowedRoles: ["Complainant", "Admin"], label: "Lodge Appellate Review" },
      { from: "Appeal", to: "Hearing", allowedRoles: ["Admin", "Chairperson"], label: "Appellate Authority Rehearing" },
    ],
  },
  {
    id: "wf-faculty-norms",
    category: "Faculty Norms",
    bureau: "RB",
    description: "Workflow for teacher-cadre ratios, 7th CPC salary scales, and ghost faculty investigations.",
    stages: ["Intake", "Scrutiny", "Show-Cause", "Hearing", "Compliance", "Disposed"],
    initialStage: "Scrutiny",
    defaultSlaDays: {
      Intake: 1,
      Scrutiny: 5,
      "Show-Cause": 21,
      Hearing: 10,
      Compliance: 30,
      Disposed: 0,
      Appeal: 30,
    },
    version: 1,
    updated_at: "2026-10-24T00:00:00Z",
    is_active: true,
    transitions: [
      { from: "Intake", to: "Scrutiny", allowedRoles: ["Admin", "RB Officer"], label: "Initiate Faculty Audit" },
      { from: "Scrutiny", to: "Show-Cause", allowedRoles: ["Admin", "RB Officer"], label: "Issue Pay/Cadre Show-Cause" },
      { from: "Show-Cause", to: "Hearing", allowedRoles: ["Admin", "RB Officer"], label: "Summon Inspection Committee Hearing" },
      { from: "Hearing", to: "Compliance", allowedRoles: ["Admin", "RB Officer", "Chairperson"], label: "Order Salary Arrears Disbursement" },
      { from: "Compliance", to: "Disposed", allowedRoles: ["Admin", "RB Officer", "Chairperson"], label: "Disposal Order Issued", requiresApproval: true, approvalRole: "Chairperson" },
    ],
  },
  {
    id: "wf-ragging-campus-safety",
    category: "Ragging & Campus Safety",
    bureau: "PGRC",
    description: "Expedited emergency workflow for anti-ragging complaints and acute student safety.",
    stages: ["Intake", "Scrutiny", "Hearing", "Compliance", "Disposed", "Appeal"],
    initialStage: "Scrutiny",
    defaultSlaDays: {
      Intake: 0.5,
      Scrutiny: 1,
      "Show-Cause": 3,
      Hearing: 2,
      Compliance: 5,
      Disposed: 0,
      Appeal: 10,
    },
    version: 1,
    updated_at: "2026-10-24T00:00:00Z",
    is_active: true,
    transitions: [
      { from: "Intake", to: "Scrutiny", allowedRoles: ["Admin", "PGRC Officer"], label: "EMERGENCY: Immediate Scrutiny" },
      { from: "Scrutiny", to: "Hearing", allowedRoles: ["Admin", "PGRC Officer"], label: "Emergency Anti-Ragging Committee Hearing" },
      { from: "Hearing", to: "Compliance", allowedRoles: ["Admin", "PGRC Officer", "Chairperson"], label: "Immediate Disciplinary Directives Issued" },
      { from: "Compliance", to: "Disposed", allowedRoles: ["Admin", "PGRC Officer", "Chairperson"], label: "Police & Safety Clearance Disposed", requiresApproval: true, approvalRole: "Chairperson" },
      { from: "Disposed", to: "Appeal", allowedRoles: ["Complainant", "Admin"], label: "Victim Appeal to Chairperson" },
    ],
  },
  {
    id: "wf-student-services",
    category: "Student Services",
    bureau: "PGRC",
    description: "Withholding certificates, migration, exam admit cards, and degree issuance.",
    stages: ["Intake", "Scrutiny", "Show-Cause", "Compliance", "Disposed", "Appeal"],
    initialStage: "Scrutiny",
    defaultSlaDays: {
      Intake: 1,
      Scrutiny: 2,
      "Show-Cause": 7,
      Hearing: 5,
      Compliance: 7,
      Disposed: 0,
      Appeal: 14,
    },
    version: 1,
    updated_at: "2026-10-24T00:00:00Z",
    is_active: true,
    transitions: [
      { from: "Intake", to: "Scrutiny", allowedRoles: ["Admin", "PGRC Officer"], label: "Review Certificate Retention Claim" },
      { from: "Scrutiny", to: "Show-Cause", allowedRoles: ["Admin", "PGRC Officer"], label: "Issue Mandatory Document Release Notice" },
      { from: "Show-Cause", to: "Compliance", allowedRoles: ["Admin", "PGRC Officer"], label: "Direct Physical Surrender of Certificates" },
      { from: "Compliance", to: "Disposed", allowedRoles: ["Admin", "PGRC Officer"], label: "Student Acknowledged Receipt - Close Docket" },
      { from: "Disposed", to: "Appeal", allowedRoles: ["Complainant", "Admin"], label: "Student Appeal for Incomplete Records" },
    ],
  },
];

export class WorkflowCaseEngine {
  private workflows: Map<string, CategoryWorkflow> = new Map();

  constructor(initialWorkflows: CategoryWorkflow[] = DEFAULT_CATEGORY_WORKFLOWS) {
    for (const wf of initialWorkflows) {
      this.workflows.set(wf.category.toLowerCase(), wf);
    }
  }

  getWorkflowForCategory(category: string): CategoryWorkflow {
    const key = category.toLowerCase().trim();
    const exact = this.workflows.get(key);
    if (exact) return exact;

    // Fuzzy matching
    for (const [k, wf] of this.workflows.entries()) {
      if (key.includes(k) || k.includes(key)) {
        return wf;
      }
    }

    // Default fallback to Fee Regulation generic workflow
    return {
      ...DEFAULT_CATEGORY_WORKFLOWS[0],
      category,
    };
  }

  getAllWorkflows(): CategoryWorkflow[] {
    return Array.from(this.workflows.values());
  }

  saveWorkflow(workflow: CategoryWorkflow): void {
    this.workflows.set(workflow.category.toLowerCase().trim(), {
      ...workflow,
      version: workflow.version + 1,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Evaluates valid transitions from the current stage given the user role
   */
  getAvailableTransitions(
    category: string,
    currentStage: WorkflowStage,
    userRole: Role
  ): WorkflowTransition[] {
    const wf = this.getWorkflowForCategory(category);
    return wf.transitions.filter(
      (t) => t.from === currentStage && (t.allowedRoles.includes(userRole) || userRole === "Admin" || userRole === "Chairperson")
    );
  }

  /**
   * Validates and executes a stage transition at runtime
   */
  validateAndTransition(
    complaint: Complaint,
    targetStage: WorkflowStage,
    actor: string,
    userRole: Role,
    providedFields: Record<string, any> = {},
    notes?: string
  ): TransitionExecutionResult {
    const wf = this.getWorkflowForCategory(complaint.category);
    const currentStage: WorkflowStage = (complaint.dynamic_fields?._current_stage as WorkflowStage) || "Scrutiny";

    // 1. Locate matching transition rule
    const transition = wf.transitions.find(
      (t) => t.from === currentStage && t.to === targetStage
    );

    if (!transition) {
      return {
        success: false,
        error: `Invalid transition from "${currentStage}" to "${targetStage}" for category "${complaint.category}".`,
        fromStage: currentStage,
        toStage: targetStage,
        timestamp: new Date().toISOString(),
        actor,
      };
    }

    // 2. Validate Role Permissions
    const isPrivileged = userRole === "Admin" || userRole === "Chairperson";
    if (!isPrivileged && !transition.allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: `Role "${userRole}" is not authorized to transition to "${targetStage}". Allowed roles: ${transition.allowedRoles.join(", ")}.`,
        fromStage: currentStage,
        toStage: targetStage,
        timestamp: new Date().toISOString(),
        actor,
      };
    }

    // 3. Validate Mandatory Required Fields
    if (transition.requiredFields && transition.requiredFields.length > 0) {
      const missing = transition.requiredFields.filter(
        (f) => !providedFields[f] && !(complaint as any)[f]
      );
      if (missing.length > 0) {
        return {
          success: false,
          error: `Mandatory field(s) missing for transition: ${missing.join(", ")}.`,
          fromStage: currentStage,
          toStage: targetStage,
          timestamp: new Date().toISOString(),
          actor,
        };
      }
    }

    // 4. Validate Approvals
    let approvalPending = false;
    if (transition.requiresApproval) {
      const approvalRole = transition.approvalRole || "Chairperson";
      if (userRole !== approvalRole && userRole !== "Admin") {
        approvalPending = true;
      }
    }

    return {
      success: true,
      fromStage: currentStage,
      toStage: targetStage,
      timestamp: new Date().toISOString(),
      actor,
      notes,
      requiredApprovalPending: approvalPending,
    };
  }
}

export const defaultWorkflowEngine = new WorkflowCaseEngine();
