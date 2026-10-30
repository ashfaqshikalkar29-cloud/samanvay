"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FilePenLine,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  ShieldCheck,
  QrCode,
  ArrowRight,
  RefreshCw,
  Landmark,
  BadgeAlert,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AICTE_INSTITUTIONS_SEED } from "@/lib/institutes-seed";
import { Bureau } from "@/lib/mock";

interface AssistedDocket {
  docketId: string;
  filedAt: string;
  operatorId: string;
  operatorName: string;
  cscCenterCode: string;
  district: string;
  state: string;
  consentType: "Verbal Recorded" | "Physical Form Signed";
  complainantName: string;
  complainantMobile: string;
  complainantCategory: string;
  institutionName: string;
  bureau: Bureau;
  category: string;
  description: string;
}

export default function AssistedFilingPage() {
  // Operator Info
  const [operatorId, setOperatorId] = useState("CSC-VLE-84291");
  const [operatorName, setOperatorName] = useState("Suresh Kumar (VLE Operator)");
  const [cscCenterCode, setCscCenterCode] = useState("CSC-MH-PUN-042");
  const [operatorDistrict, setOperatorDistrict] = useState("Pune");
  const [operatorState, setOperatorState] = useState("Maharashtra");

  // Citizen Consent
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consentType, setConsentType] = useState<"Verbal Recorded" | "Physical Form Signed">("Verbal Recorded");

  // Grievance Details
  const [complainantName, setComplainantName] = useState("");
  const [complainantMobile, setComplainantMobile] = useState("");
  const [complainantCategory, setComplainantCategory] = useState("Student");
  const [institutionId, setInstitutionId] = useState(AICTE_INSTITUTIONS_SEED[0].id);
  const [category, setCategory] = useState("Fee Regulation");
  const [description, setDescription] = useState("");

  // Result Docket State
  const [docket, setDocket] = useState<AssistedDocket | null>(null);

  const selectedInst = AICTE_INSTITUTIONS_SEED.find((i) => i.id === institutionId) || AICTE_INSTITUTIONS_SEED[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) {
      alert("Please confirm the citizen's statutory consent before submitting.");
      return;
    }
    if (!complainantName || !complainantMobile || !description) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    const bureau: Bureau = ["Fee Regulation", "Faculty Norms", "Approval / Affiliation"].includes(category)
      ? "RB"
      : "PGRC";

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newDocket: AssistedDocket = {
      docketId: `SAM-CSC-2026-${randomSuffix}`,
      filedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      operatorId,
      operatorName,
      cscCenterCode,
      district: operatorDistrict,
      state: operatorState,
      consentType,
      complainantName,
      complainantMobile,
      complainantCategory,
      institutionName: selectedInst.name,
      bureau,
      category,
      description,
    };

    setDocket(newDocket);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setDocket(null);
    setComplainantName("");
    setComplainantMobile("");
    setDescription("");
    setConsentConfirmed(false);
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Header */}
      <div className="print:hidden border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <FilePenLine className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Assisted Grievance Lodgement Portal
              </h1>
              <p className="text-xs text-slate-500">
                Common Service Centre (CSC) & AICTE Rural Citizen Helpdesk Module (Domain F & G)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs">
            Helpdesk Verified
          </Badge>
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs text-slate-600">
              Return to Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Main View: Form or Printable Receipt */}
      {!docket ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 shadow-sm space-y-4 text-xs">
              {/* Section 1: Operator Stamp */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    CSC Operator & Helpdesk Attribution
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-recorded for statutory audit</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Operator ID / VLE Code</label>
                    <Input
                      disabled
                      value={operatorId}
                      className="h-7 text-xs bg-white text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Center Code</label>
                    <Input
                      disabled
                      value={cscCenterCode}
                      className="h-7 text-xs bg-white text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">District / State</label>
                    <Input
                      disabled
                      value={`${operatorDistrict}, ${operatorState}`}
                      className="h-7 text-xs bg-white text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Citizen Informed Consent */}
              <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-200">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1.5">
                  <BadgeAlert className="h-4 w-4 text-amber-700" />
                  Statutory Consent Declaration (DPDP Act 2023)
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed mb-2.5">
                  I confirm that I have explained the AICTE grievance filing process and data handling to the citizen in their preferred language. The citizen has consented to lodgement and SMS tracking updates.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={(e) => setConsentConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                    />
                    <span>Citizen has given explicit consent *</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Consent Format:</span>
                    <select
                      value={consentType}
                      onChange={(e) => setConsentType(e.target.value as any)}
                      className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
                    >
                      <option value="Verbal Recorded">Verbal Assent (Audio/Helpdesk Verified)</option>
                      <option value="Physical Form Signed">Physical Application Signed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Complainant Details */}
              <div className="space-y-3 border-t pt-3">
                <h3 className="font-bold text-slate-800 text-sm">Complainant Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Citizen Full Name *</label>
                    <Input
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Mobile Number (for SMS Tracking) *</label>
                    <Input
                      required
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={complainantMobile}
                      onChange={(e) => setComplainantMobile(e.target.value)}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Category / Stakeholder</label>
                    <select
                      value={complainantCategory}
                      onChange={(e) => setComplainantCategory(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700"
                    >
                      <option value="Student">Student (Enrolled / Aspirant)</option>
                      <option value="Parent">Parent / Guardian</option>
                      <option value="Faculty">Faculty / Non-Teaching Staff</option>
                      <option value="Public">Citizen / Whistleblower</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Institution & Grievance */}
              <div className="space-y-3 border-t pt-3">
                <h3 className="font-bold text-slate-800 text-sm">Institution & Grievance Particulars</h3>

                <div>
                  <label className="font-semibold text-slate-700">Target AICTE Approved Institution *</label>
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700"
                  >
                    {AICTE_INSTITUTIONS_SEED.slice(0, 30).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.district}, {inst.state}) - AICTE ID: {inst.aicte_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Statutory Grievance Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700"
                    >
                      <option value="Fee Regulation">Fee Regulation & Capitation Denial</option>
                      <option value="Faculty Norms">Faculty Norms & Unpaid Salary</option>
                      <option value="Admission Irregularity">Admission Irregularity / Certificate Withholding</option>
                      <option value="Approval / Affiliation">Approval & Affiliation Verification</option>
                      <option value="Campus Safety & Anti-Ragging">Campus Safety & Anti-Ragging</option>
                      <option value="Scholarship">Scholarship & Fellowship Disbursal (NSP/PFMS)</option>
                      <option value="Hostel & Amenities">Hostel, Mess & Essential Amenities</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] block mt-1">Automatic Statutory Routing:</label>
                    <div className="mt-1.5 p-1.5 rounded bg-slate-100 font-semibold text-slate-700 text-xs">
                      {["Fee Regulation", "Faculty Norms", "Approval / Affiliation"].includes(category)
                        ? "Approval Bureau (RB) · Statutory Norms & Oversight"
                        : "Grievance Cell (PGRC) · Student Welfare & Redressal"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Detailed Complaint Narrative *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter the grievance as narrated by the citizen. Include dates, specific amounts demanded, or officials involved..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs px-5 shadow-sm"
                >
                  Submit & Generate Printable Receipt
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Guidance Cards (1 Col) */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm text-xs">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-blue-900" />
                CSC Operator Instructions
              </h3>
              <ol className="list-decimal pl-4 space-y-2 text-slate-600 leading-relaxed text-[11px]">
                <li>Verify citizen mobile number by sending an SMS test or checking phone in person.</li>
                <li>Ensure accurate institution selection so the grievance routes to the appropriate regional bureau.</li>
                <li>Always print and hand over the official physical acknowledgement slip with the QR tracking code.</li>
                <li>Inform citizen that SMS updates will be dispatched at 50% SLA threshold and upon resolution.</li>
              </ol>
            </div>

            <div className="rounded-xl border bg-blue-50/70 p-4 shadow-sm text-xs border-blue-200">
              <h3 className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-blue-800" />
                AICTE Citizen Toll-Free Helpline
              </h3>
              <div className="text-lg font-bold text-blue-950 font-mono mt-1">1800-180-5522</div>
              <p className="text-[10px] text-blue-700 mt-0.5">
                Available 24x7 in Hindi, English, and 9 regional Indic languages.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Printable Receipt View */
        <div className="space-y-4">
          <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Grievance Lodged Successfully!
              </h2>
              <p className="text-xs text-slate-500">
                Docket ID: <strong className="text-emerald-700 font-mono">{docket.docketId}</strong> has been registered in the national AICTE repository.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-600"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                File Another Complaint
              </Button>

              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs shadow-sm flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Official Slip (A4)
              </Button>
            </div>
          </div>

          {/* Actual Print Slip */}
          <div className="mx-auto max-w-2xl bg-white border-2 border-slate-900 p-8 rounded-lg shadow-lg print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-900 mb-1">
                <Landmark className="h-7 w-7 text-blue-950" />
                <span className="text-lg font-bold uppercase tracking-wider">
                  All India Council for Technical Education
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Samanvay · Centralised Public Grievance Redressal System
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 · National Helpline: 1800-180-5522
              </div>
            </div>

            {/* Title & Docket Bar */}
            <div className="mt-4 flex items-center justify-between bg-slate-100 p-3 rounded border border-slate-300">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Grievance Docket Number</div>
                <div className="text-xl font-extrabold text-blue-950 font-mono tracking-wider">
                  {docket.docketId}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Date & Time of Lodgement</div>
                <div className="text-xs font-bold text-slate-800 font-mono">{docket.filedAt}</div>
              </div>
            </div>

            {/* Details Table */}
            <div className="mt-5 space-y-3 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3 border-b pb-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Complainant Name:</span>
                  <strong className="text-sm">{docket.complainantName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Registered Mobile:</span>
                  <strong className="font-mono">{docket.complainantMobile}</strong>
                </div>
              </div>

              <div className="border-b pb-2">
                <span className="text-slate-500 block text-[10px]">Target AICTE Institution:</span>
                <strong className="text-sm">{docket.institutionName}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Statutory Category:</span>
                  <strong>{docket.category}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Assigned Regulatory Bureau:</span>
                  <strong>
                    {docket.bureau === "RB" ? "Approval Bureau (RB)" : "Grievance Redressal Cell (PGRC)"}
                  </strong>
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="text-slate-500 block text-[10px]">Grievance Narrative / Particulars:</span>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-700 bg-slate-50 p-2.5 rounded border">
                  {docket.description}
                </p>
              </div>

              {/* CSC Operator Stamp Block */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="border p-2.5 rounded bg-slate-50 text-[10px] space-y-1">
                  <div className="font-bold text-slate-800 uppercase">Assisting CSC Center Details</div>
                  <div>Center Code: <span className="font-mono">{docket.cscCenterCode}</span></div>
                  <div>Operator: {docket.operatorName}</div>
                  <div>Location: {docket.district}, {docket.state}</div>
                  <div>Consent: {docket.consentType}</div>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 p-2 rounded text-center">
                  <QrCode className="h-10 w-10 text-slate-800 mb-1" />
                  <div className="text-[9px] text-slate-500 font-mono">SCAN TO TRACK ONLINE</div>
                  <div className="text-[8px] text-slate-400">samanvay.aicte-india.org/track/{docket.docketId}</div>
                </div>
              </div>
            </div>

            {/* Tracking Instructions */}
            <div className="mt-5 border-t-2 border-slate-900 pt-3 text-[10px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 uppercase">How to Track Your Grievance:</div>
              <div>• <strong>SMS Tracking:</strong> SMS <code className="bg-slate-100 px-1 py-0.5 font-bold">SAMANVAY {docket.docketId}</code> to <strong>51969</strong>.</div>
              <div>• <strong>Online Tracking:</strong> Visit <strong>https://samanvay.aicte-india.org/track</strong> and enter your docket number.</div>
              <div>• <strong>Toll-Free Helpline:</strong> Call <strong>1800-180-5522</strong> between 9:00 AM to 6:00 PM (Monday through Saturday).</div>
            </div>

            {/* Signature & Seal Blocks */}
            <div className="mt-8 flex items-end justify-between text-center pt-6 text-[10px] text-slate-500">
              <div>
                <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
                <div>Citizen / Complainant Signature</div>
              </div>

              <div>
                <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
                <div>CSC Operator Official Stamp & Sign</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
