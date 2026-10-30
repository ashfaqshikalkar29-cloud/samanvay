import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { fmtDate, fmtDateTime } from "@/components/ui-bits";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("id") || searchParams.get("complaint_id");
    const format = searchParams.get("format") || "html";

    if (!complaintId) {
      return NextResponse.json({ error: "id parameter is required." }, { status: 400 });
    }

    const repo = getRepo();
    const data = await repo.loadAll();
    const complaint = data.complaints.find((c) => c.id === complaintId || c.tracking_id === complaintId);

    if (!complaint) {
      return NextResponse.json({ error: `Complaint "${complaintId}" not found.` }, { status: 404 });
    }

    const institution = data.institutions.find((i) => i.id === complaint.institution_id);
    const isDisposed = complaint.status === "Disposed";
    const documentType = isDisposed ? "STATUTORY DISPOSAL & COMPLIANCE ORDER" : "OFFICIAL GRIEVANCE ACKNOWLEDGMENT SLIP";
    const trackingId = complaint.tracking_id || `SMV-2026-${complaint.id.replace(/\D/g, "").padStart(6, "0")}`;

    if (format === "json") {
      return NextResponse.json({
        success: true,
        document_type: documentType,
        tracking_id: trackingId,
        complaint_id: complaint.id,
        category: complaint.category,
        bureau: complaint.bureau,
        status: complaint.status,
        date_received: complaint.date_received,
        institution: institution?.name || complaint.institution_id,
        aicte_id: institution?.aicte_id,
        region: institution?.region,
        assigned_officer: complaint.assigned_officer,
        next_action: complaint.next_action,
      });
    }

    // Generate Official AICTE Printable HTML Document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AICTE Samanvay - ${documentType} (${trackingId})</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #002147;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .emblem {
      font-size: 26px;
      font-weight: bold;
      color: #990000;
      letter-spacing: 1px;
    }
    .council {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      color: #002147;
    }
    .subtext {
      font-size: 12px;
      color: #444;
    }
    .doc-title {
      background: #f0f4f8;
      border: 1px solid #c0d0e0;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      font-weight: bold;
      margin: 18px 0;
      letter-spacing: 0.5px;
    }
    table.meta {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    table.meta td {
      padding: 6px 8px;
      border: 1px solid #ddd;
    }
    table.meta td.label {
      background: #f9f9f9;
      font-weight: bold;
      width: 25%;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #002147;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      color: #002147;
    }
    .content-box {
      font-size: 12px;
      padding: 10px;
      border: 1px solid #ddd;
      background: #fafafa;
      margin-bottom: 18px;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      font-size: 11px;
    }
    .seal-box {
      border: 2px dashed #990000;
      padding: 10px;
      text-align: center;
      width: 220px;
      color: #990000;
      font-weight: bold;
    }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #002147;
      color: #fff;
      padding: 8px 16px;
      font-family: sans-serif;
      font-size: 12px;
      font-weight: bold;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    @media print {
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

  <div class="header">
    <div class="emblem">सत्यमेव जयते</div>
    <div class="council">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
    <div class="subtext">
      Statutory Body Under Ministry of Education, Government of India<br>
      Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | Portal: samanvay.aicte.gov.in
    </div>
  </div>

  <div class="doc-title">${documentType}</div>

  <table class="meta">
    <tr>
      <td class="label">AICTE Tracking ID</td>
      <td><strong>${trackingId}</strong></td>
      <td class="label">Docket Reference</td>
      <td>${complaint.id}</td>
    </tr>
    <tr>
      <td class="label">Filing Date</td>
      <td>${complaint.date_received}</td>
      <td class="label">Intake Channel</td>
      <td>${complaint.channel?.toUpperCase()}</td>
    </tr>
    <tr>
      <td class="label">Grievance Category</td>
      <td>${complaint.category}</td>
      <td class="label">Statutory Status</td>
      <td><strong>${complaint.status}</strong></td>
    </tr>
    <tr>
      <td class="label">Adjudicating Bureau</td>
      <td>${complaint.bureau === "RB" ? "Approval & Regulatory Bureau (RB)" : "Public Grievance Redressal Committee (PGRC)"}</td>
      <td class="label">Assigned Officer</td>
      <td>${complaint.assigned_officer}</td>
    </tr>
  </table>

  <div class="section-title">Institutional Particulars</div>
  <table class="meta">
    <tr>
      <td class="label">Institution Name</td>
      <td colspan="3"><strong>${institution?.name || complaint.institution_id}</strong></td>
    </tr>
    <tr>
      <td class="label">AICTE Permanent ID</td>
      <td>${institution?.aicte_id || "N/A"}</td>
      <td class="label">Regional Office</td>
      <td>${institution?.region || "N/A"}</td>
    </tr>
    <tr>
      <td class="label">State / District</td>
      <td colspan="3">${institution?.state || "N/A"} / ${institution?.district || "N/A"}</td>
    </tr>
  </table>

  <div class="section-title">Grievance Substance & Allegation Record</div>
  <div class="content-box">
    ${complaint.description || "Substance on record with designated grievance officer."}
  </div>

  ${isDisposed ? `
  <div class="section-title">Disposal Order & Regulatory Compliance</div>
  <div class="content-box" style="background: #f0fdf4; border-color: #86efac;">
    <strong>Statutory Redressal Determination:</strong><br>
    The complaint has been examined under the provisions of the AICTE Approval Process Handbook (APH) and Redressal Regulations. Necessary directives have been communicated to the institution. Compliance has been duly verified and recorded on the Samanvay portal.
    <br><br>
    <strong>Next Action / Order:</strong> ${complaint.next_action}
  </div>
  ` : `
  <div class="section-title">Current Redressal Milestone & Direction</div>
  <div class="content-box">
    <strong>Scheduled Step:</strong> ${complaint.next_action}<br>
    <strong>Stage:</strong> ${(complaint.dynamic_fields?._current_stage as string) || "Under Active Scrutiny"}
  </div>
  `}

  <div class="signature-grid">
    <div class="seal-box">
      OFFICIAL DIGITAL SEAL<br>
      AICTE SAMANVAY PORTAL<br>
      GOVERNMENT OF INDIA<br>
      VERIFIED AUTHENTIC
    </div>
    <div style="text-align: right; font-size: 12px;">
      <p style="margin-bottom: 40px;">Digitally signed &amp; authenticated by:</p>
      <strong>${complaint.assigned_officer}</strong><br>
      <span>Designated Grievance Redressal Officer</span><br>
      <span>AICTE ${complaint.bureau === "RB" ? "Approval Bureau" : "Public Grievance Bureau"}</span>
    </div>
  </div>

  <div style="margin-top: 30px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 8px;">
    This is an official computer-generated document issued by Samanvay Portal under Section 10 of AICTE Act. Valid without physical signature. Verify online at https://samanvay.aicte.gov.in/track/${trackingId}
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    console.error("Error generating PDF summary:", err);
    return NextResponse.json({ error: "Failed to generate PDF summary document." }, { status: 500 });
  }
}
