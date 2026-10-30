import { NextRequest, NextResponse } from "next/server";
import { defaultNotificationService } from "@/lib/notifications/service";
import { NotificationPayload } from "@/lib/notifications/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");
    const role = searchParams.get("role");
    const channel = searchParams.get("channel");

    const notifications = defaultNotificationService.getNotifications({
      complaint_id: complaintId || undefined,
      recipient_role: role || undefined,
      channel: (channel as any) || undefined,
    });

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json({ error: "Failed to fetch notifications." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body as NotificationPayload;

    if (!payload.complaint_id || !payload.recipient_contact || !payload.message) {
      return NextResponse.json(
        { error: "complaint_id, recipient_contact, and message are required." },
        { status: 400 }
      );
    }

    const record = await defaultNotificationService.sendNotification({
      ...payload,
      channel: payload.channel || "email",
      recipient_role: payload.recipient_role || "complainant",
      recipient_name: payload.recipient_name || "Citizen",
      title: payload.title || "AICTE Grievance Notification",
    });

    return NextResponse.json({
      success: true,
      notification: record,
    });
  } catch (err: any) {
    console.error("Error dispatching notification:", err);
    return NextResponse.json({ error: "Failed to dispatch notification." }, { status: 500 });
  }
}
