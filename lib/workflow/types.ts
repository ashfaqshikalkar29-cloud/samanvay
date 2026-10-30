// ==============================================================================
// SAMANVAY: Configurable Workflow & Stage Transition Types (A. Workflow Engine)
// Stores category-specific stage sequences, transition guards, roles & approvals
// ==============================================================================

import { Role, Bureau } from "../mock";

export type WorkflowStage =
  | "Intake"
  | "Scrutiny"
  | "Show-Cause"
  | "Hearing"
  | "Compliance"
  | "Disposed"
  | "Appeal";

export interface WorkflowTransition {
  from: WorkflowStage;
  to: WorkflowStage;
  allowedRoles: Role[];
  requiredFields?: string[];
  requiresApproval?: boolean;
  approvalRole?: Role;
  label: string;
  description?: string;
}

export interface CategoryWorkflow {
  id: string;
  category: string;
  bureau: Bureau;
  description: string;
  stages: WorkflowStage[];
  initialStage: WorkflowStage;
  transitions: WorkflowTransition[];
  defaultSlaDays: Record<WorkflowStage, number>;
  version: number;
  updated_at: string;
  is_active: boolean;
}

export interface TransitionExecutionResult {
  success: boolean;
  error?: string;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  timestamp: string;
  actor: string;
  notes?: string;
  requiredApprovalPending?: boolean;
}

export interface StageHistoryEntry {
  from_stage: WorkflowStage;
  to_stage: WorkflowStage;
  transitioned_by: string;
  role: Role;
  transitioned_at: string;
  notes?: string;
  approval_status?: "approved" | "pending" | "rejected";
}
