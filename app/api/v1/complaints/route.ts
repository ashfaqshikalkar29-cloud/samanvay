import { NextRequest, NextResponse } from "next/server";
import { apiKeyManager } from "@/lib/api-keys";
import { getRepo } from "@/lib/data/repo";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const auth = apiKeyManager.validateKey(apiKey || "");

    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const bureau = searchParams.get("bureau");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const repo = getRepo();
    const { complaints } = await repo.loadAll();

    let filtered = complaints;
    if (bureau) filtered = filtered.filter((c) => c.bureau === bureau);
    if (status) filtered = filtered.filter((c) => c.status === status);
    if (category) filtered = filtered.filter((c) => c.category === category);

    const paginated = filtered.slice(offset, offset + limit);

    // Sanitize PII for external consumers per DPDP Act
    const sanitized = paginated.map((c) => ({
      id: c.id,
      tracking_id: c.tracking_id,
      institution_id: c.institution_id,
      bureau: c.bureau,
      status: c.status,
      category: c.category,
      channel: c.channel,
      date_received: c.date_received,
      assigned_officer: c.assigned_officer,
      is_overlap_flagged: c.is_overlap_flagged,
      next_action: c.next_action,
    }));

    return NextResponse.json({
      success: true,
      apiVersion: "v1.0",
      tenant: auth.tenant,
      totalCount: filtered.length,
      limit,
      offset,
      data: sanitized,
    });
  } catch (err: any) {
    console.error("API v1 Complaints Error:", err);
    return NextResponse.json({ error: "Internal API processing error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const auth = apiKeyManager.validateKey(apiKey || "");

    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.institution_id || !body.description || !body.category) {
      return NextResponse.json(
        { error: "Missing required fields: institution_id, category, and description are mandatory." },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const docketId = `C-V1-${Date.now().toString().slice(-4)}`;
    const trackingId = `SMV-2026-V1-${Date.now().toString().slice(-6)}`;

    const newComplaint: any = {
      id: docketId,
      tracking_id: trackingId,
      institution_id: body.institution_id,
      bureau: body.bureau || (body.category.includes("Fee") || body.category.includes("Faculty") ? "RB" : "PGRC"),
      status: "Pending",
      category: body.category,
      channel: "api",
      description: body.description,
      date_received: new Date().toISOString().split("T")[0],
      assigned_officer: "Dr. A. Kulkarni",
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Initial API Scrutiny",
      dynamic_fields: {
        external_source: auth.tenant,
        external_ref: body.external_reference || null,
      },
    };

    await repo.insertComplaint(newComplaint);

    return NextResponse.json(
      {
        success: true,
        apiVersion: "v1.0",
        message: "Grievance successfully docketed via AICTE v1 REST API.",
        complaint: {
          id: docketId,
          tracking_id: trackingId,
          status: newComplaint.status,
          bureau: newComplaint.bureau,
          category: newComplaint.category,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("API v1 Ingestion Error:", err);
    return NextResponse.json({ error: "Failed to ingest complaint via API." }, { status: 500 });
  }
}
