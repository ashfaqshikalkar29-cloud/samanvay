import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultWorkflowEngine } from "@/lib/workflow/engine";
import { WorkflowStage } from "@/lib/workflow/types";
import { Role, Status } from "@/lib/mock";
import { CaseEvent } from "@/lib/timeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      complaint_id,
      target_stage,
      actor,
      role,
      notes,
      provided_fields = {},
    } = body as {
      complaint_id: string;
      target_stage: WorkflowStage;
      actor: string;
      role: Role;
      notes?: string;
      provided_fields?: Record<string, any>;
    };

    if (!complaint_id || !target_stage) {
      return NextResponse.json(
        { error: "complaint_id and target_stage are required." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
    }

    // Validate transition via engine
    const validation = defaultWorkflowEngine.validateAndTransition(
      complaint,
      target_stage,
      actor || "Officer",
      role || "Admin",
      provided_fields,
      notes
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // Map workflow stage to high-level system status
    let newStatus: Status = complaint.status;
    if (target_stage === "Disposed") {
      newStatus = "Disposed";
    } else if (target_stage === "Intake" || target_stage === "Scrutiny") {
      newStatus = "Pending";
    } else {
      newStatus = "In-Process";
    }

    const timestamp = validation.timestamp;
    const historyEntry = {
      from_stage: validation.fromStage,
      to_stage: target_stage,
      transitioned_by: actor || "Officer",
      role: role || "Admin",
      transitioned_at: timestamp,
      notes: notes || undefined,
      approval_pending: validation.requiredApprovalPending,
    };

    const existingHistory = complaint.dynamic_fields?.stage_history || [];
    const updatedDynamic = {
      ...(complaint.dynamic_fields || {}),
      _current_stage: target_stage,
      _stage_started_at: timestamp,
      stage_history: [...existingHistory, historyEntry],
      ...(provided_fields || {}),
    };

    // Update in repository
    await repo.updateComplaint(complaint_id, {
      status: newStatus,
    });

    // Also update dynamic fields directly on complaint object in repo
    complaint.dynamic_fields = updatedDynamic;
    complaint.status = newStatus;

    // Add Audit Log Entry
    await repo.addAudit({
      complaint_id,
      action: `Stage: ${target_stage}`,
      timestamp,
      officer: actor || "Officer",
      remarks: `Transitioned from ${validation.fromStage} to ${target_stage}. ${notes ? `Remarks: ${notes}` : ""}`,
    });

    // Add Case Event to Timeline
    const event: CaseEvent = {
      id: `evt-stage-${Date.now()}`,
      complaint_id,
      bureau: complaint.bureau,
      actor: `${actor || "Officer"} (${role || "Admin"})`,
      event_type: target_stage === "Hearing" ? "hearing" : target_stage === "Disposed" ? "decision" : "status_change",
      title: `Workflow Stage Transition: ${target_stage}`,
      description: `Stage moved from ${validation.fromStage} to ${target_stage}. ${notes || ""}`,
      created_at: timestamp,
      metadata: { fromStage: validation.fromStage, toStage: target_stage, notes, role },
    };
    await repo.addEvent(event);

    return NextResponse.json({
      success: true,
      complaint_id,
      from_stage: validation.fromStage,
      to_stage: target_stage,
      status: newStatus,
      approval_pending: validation.requiredApprovalPending,
      timestamp,
    });
  } catch (err: any) {
    console.error("Error transitioning complaint stage:", err);
    return NextResponse.json({ error: "Failed to transition complaint stage." }, { status: 500 });
  }
}
