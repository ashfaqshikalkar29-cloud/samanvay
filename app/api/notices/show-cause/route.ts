import { NextRequest, NextResponse } from "next/server";
import { noticeManager } from "@/lib/notices";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");
    const instituteId = searchParams.get("institution_id");

    if (complaintId) {
      const notices = noticeManager.getNoticesForComplaint(complaintId);
      return NextResponse.json({ success: true, count: notices.length, notices });
    }

    if (instituteId) {
      const notices = noticeManager.getNoticesForInstitute(instituteId);
      return NextResponse.json({ success: true, count: notices.length, notices });
    }

    return NextResponse.json({ success: true, notices: [] });
  } catch (err: any) {
    console.error("Get Notices Error:", err);
    return NextResponse.json({ error: "Failed to fetch show-cause notices." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    if (!hasPermission(auth.role, "showcause:issue")) {
      return NextResponse.json(
        { error: `Access Denied: Role '${auth.role}' is not authorized to issue statutory show-cause notices.` },
        { status: 403 }
      );
    }

    const { complaint_id, institution_id, institution_name, category, allegation_summary, officer_name, deadline_days } =
      body;

    if (!complaint_id || !institution_id || !allegation_summary) {
      return NextResponse.json(
        { error: "Missing required fields: complaint_id, institution_id, and allegation_summary are required." },
        { status: 400 }
      );
    }

    const notice = await noticeManager.issueNotice({
      complaintId: complaint_id,
      institutionId: institution_id,
      institutionName: institution_name || "AICTE Affiliated Institution",
      category: category || "Fee Regulation",
      allegationSummary: allegation_summary,
      issuedByOfficer: officer_name || "Regional Officer, AICTE",
      deadlineDays: deadline_days || 15,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Statutory show-cause notice rendered and dispatched to institution docket.",
        notice,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Issue Notice Error:", err);
    return NextResponse.json({ error: "Failed to issue show-cause notice." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { notice_id, explanation, attachment_urls, is_extension_requested } = body;

    if (!notice_id || !explanation) {
      return NextResponse.json(
        { error: "Notice ID and formal explanation statement are required." },
        { status: 400 }
      );
    }

    const updated = await noticeManager.submitReply(notice_id, {
      explanation,
      attachmentUrls: attachment_urls || [],
      isExtensionRequested: is_extension_requested || false,
    });

    if (!updated) {
      return NextResponse.json({ error: "Show-cause notice record not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Formal institutional reply and documentary proof submitted successfully.",
      notice: updated,
    });
  } catch (err: any) {
    console.error("Submit Reply Error:", err);
    return NextResponse.json({ error: "Failed to submit show-cause reply." }, { status: 500 });
  }
}
