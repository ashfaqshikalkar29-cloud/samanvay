import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import type { Bureau } from "@/lib/mock";
import type { InterBureauTask, TaskPriority, TaskStatus } from "@/lib/tasks";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bureau = searchParams.get("bureau") as Bureau | null;
    const complaintId = searchParams.get("complaint_id");

    const repo = getRepo();
    const tasks = await repo.getTasks({
      bureau: bureau || undefined,
      complaintId: complaintId || undefined,
    });

    return NextResponse.json({
      success: true,
      total_tasks: tasks.length,
      tasks,
    });
  } catch (err: any) {
    console.error("Tasks fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch inter-bureau tasks." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "create", ...payload } = body;
    const repo = getRepo();

    if (action === "update_status") {
      const { task_id, status, officer } = payload;
      if (!task_id || !status) {
        return NextResponse.json({ error: "task_id and status are required to update." }, { status: 400 });
      }
      await repo.updateTaskStatus(task_id, status as TaskStatus, officer);
      return NextResponse.json({ success: true, message: `Task status updated to ${status}.` });
    }

    // Default: create task
    const {
      complaint_id,
      from_bureau,
      to_bureau,
      assigned_to,
      title,
      description,
      deadline,
      priority = "medium",
      mentions = [],
      created_by,
    } = payload;

    if (!complaint_id || !from_bureau || !to_bureau || !title || !deadline) {
      return NextResponse.json(
        { error: "complaint_id, from_bureau, to_bureau, title, and deadline are required." },
        { status: 400 }
      );
    }

    const newTask: InterBureauTask = {
      id: `task-${Date.now()}`,
      complaint_id,
      from_bureau: from_bureau as Bureau,
      to_bureau: to_bureau as Bureau,
      assigned_to: assigned_to || "Officer",
      title: title.trim(),
      description: description ? description.trim() : "",
      deadline,
      status: "pending",
      priority: (priority as TaskPriority) || "medium",
      mentions: Array.isArray(mentions) ? mentions : [],
      created_by: created_by || "Officer",
      created_at: new Date().toISOString(),
    };

    await repo.createTask(newTask);

    return NextResponse.json({
      success: true,
      message: "Inter-bureau task delegated successfully.",
      task: newTask,
    });
  } catch (err: any) {
    console.error("Task operation error:", err);
    return NextResponse.json({ error: "Failed to process task." }, { status: 500 });
  }
}
