import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultAssignmentEngine, AssignmentStrategy } from "@/lib/assignment";
import { Role } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      complaint_id,
      new_officer,
      justification,
      reassigned_by = "Officer",
      role = "Admin",
      strategy,
    } = body as {
      complaint_id: string;
      new_officer?: string;
      justification?: string;
      reassigned_by?: string;
      role?: Role;
      strategy?: AssignmentStrategy;
    };

    if (!complaint_id) {
      return NextResponse.json({ error: "complaint_id is required." }, { status: 400 });
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaint_id}" not found.` }, { status: 404 });
    }

    // If no explicit officer provided, execute smart auto-assignment
    let targetOfficer = new_officer;
    let reason = justification;

    if (!targetOfficer) {
      const decision = defaultAssignmentEngine.assignOfficer(
        complaint.bureau,
        complaint.category,
        undefined,
        strategy || "least-workload"
      );
      targetOfficer = decision.officerName;
      reason = justification || `Smart Auto-Assignment: ${decision.rationale}`;
    }

    const result = defaultAssignmentEngine.reassignComplaint(
      complaint,
      targetOfficer,
      reason || "Reassigned per operational load balancing",
      reassigned_by,
      role
    );

    if (!result.success || !result.patch) {
      return NextResponse.json({ error: result.error || "Reassignment failed." }, { status: 422 });
    }

    // Apply patch to complaint in repo
    await repo.updateComplaint(complaint_id, {
      assigned_officer: result.patch.assigned_officer,
    });

    // Also update dynamic fields
    complaint.assigned_officer = result.patch.assigned_officer!;
    if (result.patch.bureau) complaint.bureau = result.patch.bureau;
    if (result.patch.dynamic_fields) {
      complaint.dynamic_fields = {
        ...(complaint.dynamic_fields || {}),
        ...result.patch.dynamic_fields,
      };
    }

    // Write audit log
    if (result.auditEntry) {
      await repo.addAudit(result.auditEntry);
    }

    // Write case timeline event
    if (result.timelineEvent) {
      await repo.addEvent(result.timelineEvent);
    }

    return NextResponse.json({
      success: true,
      complaint_id,
      assigned_officer: targetOfficer,
      bureau: complaint.bureau,
      justification: reason,
      reassigned_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error reassigning complaint:", err);
    return NextResponse.json({ error: "Failed to reassign complaint." }, { status: 500 });
  }
}
