import { NextRequest, NextResponse } from "next/server";
import { defaultWorkflowEngine } from "@/lib/workflow/engine";
import { CategoryWorkflow } from "@/lib/workflow/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (category) {
      const wf = defaultWorkflowEngine.getWorkflowForCategory(category);
      return NextResponse.json({ success: true, workflow: wf });
    }

    const workflows = defaultWorkflowEngine.getAllWorkflows();
    return NextResponse.json({ success: true, count: workflows.length, workflows });
  } catch (err: any) {
    console.error("Error fetching workflows:", err);
    return NextResponse.json({ error: "Failed to fetch workflow configurations." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow, role } = body as { workflow: CategoryWorkflow; role?: string };

    // RBAC: Only Admin or Chairperson can modify workflow definitions
    if (role && role !== "Admin" && role !== "Chairperson") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin or Chairperson can modify statutory workflow definitions." },
        { status: 403 }
      );
    }

    if (!workflow || !workflow.category || !workflow.stages || !workflow.transitions) {
      return NextResponse.json(
        { error: "Invalid workflow payload: category, stages, and transitions are required." },
        { status: 400 }
      );
    }

    defaultWorkflowEngine.saveWorkflow(workflow);

    return NextResponse.json({
      success: true,
      message: `Workflow for "${workflow.category}" updated successfully.`,
      workflow: defaultWorkflowEngine.getWorkflowForCategory(workflow.category),
    });
  } catch (err: any) {
    console.error("Error updating workflow:", err);
    return NextResponse.json({ error: "Failed to update workflow configuration." }, { status: 500 });
  }
}
