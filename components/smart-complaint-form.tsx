"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  EyeOff,
  FileCheck2,
  Info,
  Key,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, LinkButton, QrCodeView, StatusBadge, fmtDate } from "@/components/ui-bits";
import { InstituteCombobox } from "@/components/institute-combobox";
import { VoiceInput } from "@/components/voice-input";
import { EvidenceUploader } from "@/components/evidence-uploader";
import { OtpModal } from "@/components/otp-modal";
import { CATEGORY_SCHEMAS, type CategorySchema, validateDynamicFields } from "@/lib/intake-schemas";
import { useApp } from "@/lib/store";
import { jaccard, OVERLAP_CONFIG } from "@/lib/overlap";
import type { Channel, EvidenceFile, Institution } from "@/lib/mock";

const DRAFT_STORAGE_KEY = "sam_complaint_draft_v2";

interface SmartComplaintFormProps {
  forcedChannel?: Channel;
  officerMode?: boolean;
}

export function SmartComplaintForm({ forcedChannel = "web", officerMode = false }: SmartComplaintFormProps) {
  const { complaints } = useApp();

  // Core Fields
  const [channel, setChannel] = useState<Channel>(forcedChannel);
  const [selectedInstitute, setSelectedInstitute] = useState<Institution | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>("fees");
  const [description, setDescription] = useState("");
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  // Complainant Details & Anonymous Mode
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [complainantName, setComplainantName] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");

  // Officer Walk-in Specific
  const [walkinOfficer, setWalkinOfficer] = useState("");

  // UI States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  // Active Category Schema
  const activeSchema: CategorySchema | undefined = CATEGORY_SCHEMAS[selectedCategoryKey];

  // 1. Auto-save Draft to LocalStorage
  useEffect(() => {
    // Only auto-save if user has typed something and not yet submitted
    if (submitResult) return;
    if (!description && !complainantName && Object.keys(dynamicFields).length === 0) return;

    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          channel,
          selectedInstitute,
          selectedCategoryKey,
          description,
          dynamicFields,
          isAnonymous,
          complainantName,
          complainantPhone,
          complainantEmail,
          savedAt: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        setDraftSavedAt(draftPayload.savedAt);
      } catch (e) {}
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    channel,
    selectedInstitute,
    selectedCategoryKey,
    description,
    dynamicFields,
    isAnonymous,
    complainantName,
    complainantPhone,
    complainantEmail,
    submitResult,
  ]);

  // 2. Draft Restore on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved && !hasRestoredDraft) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedInstitute) setSelectedInstitute(parsed.selectedInstitute);
        if (parsed.selectedCategoryKey) setSelectedCategoryKey(parsed.selectedCategoryKey);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.dynamicFields) setDynamicFields(parsed.dynamicFields);
        if (parsed.isAnonymous !== undefined) setIsAnonymous(parsed.isAnonymous);
        if (parsed.complainantName) setComplainantName(parsed.complainantName);
        if (parsed.complainantPhone) setComplainantPhone(parsed.complainantPhone);
        if (parsed.complainantEmail) setComplainantEmail(parsed.complainantEmail);
        setDraftSavedAt(parsed.savedAt || "Earlier");
        setHasRestoredDraft(true);
      }
    } catch (e) {}
  }, [hasRestoredDraft]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDescription("");
    setDynamicFields({});
    setComplainantName("");
    setComplainantPhone("");
    setComplainantEmail("");
    setSelectedInstitute(null);
    setDraftSavedAt(null);
  };

  // 3. Live Duplicates / Cross-Bureau Overlap Check
  const potentialDupes = useMemo(() => {
    if (description.trim().length < 25) return [];
    return complaints
      .filter((c) => c.status !== "Disposed")
      .map((c) => ({ c, score: jaccard(description, c.description) }))
      .filter(({ score }) => score >= OVERLAP_CONFIG.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [description, complaints]);

  // Handle Dynamic Field Change
  const handleDynamicChange = (fieldId: string, val: any) => {
    setDynamicFields((prev) => ({ ...prev, [fieldId]: val }));
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Pre-submit validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedInstitute) {
      errors.institution = "Please select an AICTE approved institute.";
    }

    if (!description.trim() || description.trim().length < 15) {
      errors.description = "Please describe your grievance with at least 15 characters.";
    }

    // Dynamic fields validation
    if (activeSchema) {
      const dynResult = validateDynamicFields(selectedCategoryKey, dynamicFields);
      if (!dynResult.valid) {
        Object.assign(errors, dynResult.errors);
      }
    }

    if (!isAnonymous && !officerMode) {
      if (!complainantPhone.trim()) {
        errors.phone = "Mobile number is required for tracking and SMS updates.";
      } else if (!/^\+?[0-9]{10,12}$/.test(complainantPhone.replace(/\s+/g, ""))) {
        errors.phone = "Please enter a valid 10-digit mobile number.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit trigger
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // In officer mode or anonymous mode without phone, skip OTP and submit directly
    if (officerMode || isAnonymous || !complainantPhone.trim()) {
      executeSubmission("direct-auth");
    } else {
      setShowOtpModal(true);
    }
  };

  // Send to unified intake endpoint
  const executeSubmission = async (verificationToken: string) => {
    setShowOtpModal(false);
    setIsSubmitting(true);

    try {
      const payload = {
        channel,
        institution_id: selectedInstitute?.id,
        category: activeSchema?.name || selectedCategoryKey,
        description: description.trim(),
        dynamic_fields: dynamicFields,
        evidence: evidenceFiles,
        is_anonymous: isAnonymous,
        complainant_name: isAnonymous ? "" : complainantName.trim(),
        complainant_phone: isAnonymous ? "" : complainantPhone.trim(),
        complainant_email: isAnonymous ? "" : complainantEmail.trim(),
        assigned_officer: walkinOfficer || undefined,
        verification_token: verificationToken,
      };

      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSubmitResult(data.complaint);
      } else {
        alert(data.error || "Failed to submit grievance. Please try again.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Network error submitting grievance. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (submitResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-in fade-in duration-300">
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">
                Grievance Registered Successfully
              </span>
              <h2 className="text-3xl font-extrabold text-blue-950 font-mono mt-1">
                {submitResult.tracking_id}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Official Docket Ref: <strong className="text-slate-800">{submitResult.id}</strong> · Received: {fmtDate(submitResult.date_received)}
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center pt-2">
              <QrCodeView value={submitResult.tracking_url} size={150} />
              <p className="text-[11px] text-slate-500 mt-2">
                Scan QR code to track grievance progress live
              </p>
            </div>

            {/* Anonymous Access Key Callout */}
            {submitResult.is_anonymous && submitResult.anonymous_access_key && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-left space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Key className="h-4 w-4" /> Confidential Follow-up Access Key
                </div>
                <p className="text-xs text-amber-800">
                  Because you filed anonymously, save this secret key. You will need it to verify and view orders:
                </p>
                <p className="font-mono text-base font-bold text-amber-950 bg-white/80 p-2 rounded border border-amber-200 select-all">
                  {submitResult.anonymous_access_key}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Institution:</span>
                <span className="font-semibold text-slate-900">{submitResult.institution}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Bureau Jurisdiction:</span>
                <BureauBadge bureau={submitResult.bureau} />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Assigned Officer:</span>
                <span className="font-medium text-slate-800">{submitResult.assigned_officer}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Intake Channel:</span>
                <span className="uppercase font-bold text-blue-900">{submitResult.channel}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <LinkButton href={`/track/${submitResult.tracking_id}`} className="bg-blue-900 hover:bg-blue-800">
                Open Public Status Tracker →
              </LinkButton>
              <LinkButton href="/" variant="outline">
                Return to Dashboard
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Draft autosave banner */}
      {draftSavedAt && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Save className="h-3.5 w-3.5 text-blue-700" />
            <span>Draft automatically saved at {draftSavedAt}</span>
          </div>
          <button onClick={clearDraft} className="text-blue-700 hover:underline text-[11px] font-medium">
            Discard Draft
          </button>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* 1. Institution and Channel Details */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-950 text-lg flex items-center justify-between">
              <span>1. AICTE Institution &amp; Category</span>
              <BureauBadge bureau={activeSchema?.bureau || "PGRC"} />
            </CardTitle>
            <CardDescription className="text-xs">
              Select the approved technical institution and classification of your grievance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel Selection (if in officer mode) */}
            {officerMode && (
              <div className="space-y-1.5">
                <Label>Intake Channel <span className="text-red-500">*</span></Label>
                <Select value={channel} onValueChange={(v) => { if (v) setChannel(v as Channel); }}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in at AICTE Bureau Office</SelectItem>
                    <SelectItem value="helpline">National Helpline (Toll-Free Call)</SelectItem>
                    <SelectItem value="email">Email Intake (grievance@aicte-india.org)</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp Grievance Bot</SelectItem>
                    <SelectItem value="web">Web Portal Direct</SelectItem>
                    <SelectItem value="mobile">AICTE Mobile App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Type-ahead Institution Search */}
            <div className="space-y-1.5">
              <Label>AICTE Approved Institution <span className="text-red-500">*</span></Label>
              <InstituteCombobox
                value={selectedInstitute?.id || ""}
                onSelect={(inst) => {
                  setSelectedInstitute(inst);
                  if (fieldErrors.institution) {
                    setFieldErrors((prev) => {
                      const n = { ...prev };
                      delete n.institution;
                      return n;
                    });
                  }
                }}
              />
              {fieldErrors.institution && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.institution}</p>
              )}
            </div>

            {/* Auto-filled Institution Card */}
            {selectedInstitute && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs space-y-1 text-slate-700">
                <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-blue-800" /> Auto-populated AICTE Registry Details:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">AICTE ID</span>
                    <strong className="text-slate-900">{selectedInstitute.aicte_id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">State</span>
                    <strong className="text-slate-900">{selectedInstitute.state || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">District</span>
                    <strong className="text-slate-900">{selectedInstitute.district || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Region</span>
                    <strong className="text-slate-900">{selectedInstitute.region}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Category selection */}
            <div className="space-y-1.5">
              <Label>Grievance Category <span className="text-red-500">*</span></Label>
              <Select value={selectedCategoryKey} onValueChange={(val) => {
                if (val) {
                  setSelectedCategoryKey(val);
                  setDynamicFields({});
                }
              }}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_SCHEMAS).map(([key, schema]) => (
                    <SelectItem key={key} value={key}>
                      {schema.name} ({schema.bureau} Bureau)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSchema && (
                <p className="text-xs text-slate-500 italic mt-0.5">{activeSchema.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Dynamic Smart Form Fields for this Category */}
        {activeSchema && activeSchema.fields.length > 0 && (
          <Card className="border-blue-100 bg-gradient-to-b from-blue-50/30 to-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-950 text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-800" />
                <span>2. Category-Specific Details ({activeSchema.name})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                These required fields help AICTE officers resolve this specific issue faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {activeSchema.fields.map((f) => {
                  const error = fieldErrors[f.id];
                  const value = dynamicFields[f.id] ?? "";

                  return (
                    <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={f.id} className="text-xs font-semibold text-slate-800">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </Label>
                        <span className="text-[10px] text-slate-400" title={f.helpText}>
                          <Info className="h-3 w-3 inline mr-0.5 text-blue-600" /> Help
                        </span>
                      </div>

                      {f.type === "select" ? (
                        <Select value={value} onValueChange={(val) => handleDynamicChange(f.id, val)}>
                          <SelectTrigger id={f.id} className="border-slate-300 bg-white text-xs h-9">
                            <SelectValue placeholder="Choose option…" />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.type === "number" ? (
                        <Input
                          id={f.id}
                          type="number"
                          placeholder={f.placeholder}
                          value={value}
                          onChange={(e) => handleDynamicChange(f.id, e.target.value)}
                          className="border-slate-300 bg-white text-xs h-9"
                        />
                      ) : f.type === "date" ? (
                        <Input
                          id={f.id}
                          type="date"
                          value={value}
                          onChange={(e) => handleDynamicChange(f.id, e.target.value)}
                          className="border-slate-300 bg-white text-xs h-9"
                        />
                      ) : (
                        <Input
                          id={f.id}
                          type="text"
                          placeholder={f.placeholder}
                          value={value}
                          onChange={(e) => handleDynamicChange(f.id, e.target.value)}
                          className="border-slate-300 bg-white text-xs h-9"
                        />
                      )}

                      <p className="text-[11px] text-slate-500">{f.helpText}</p>
                      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Description & Voice Dictation */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-950 text-base">3. Detailed Grievance Description</CardTitle>
            <CardDescription className="text-xs">
              Type or dictate using your voice in your preferred regional language (English, Hindi, Marathi, Tamil, Bengali).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Voice Dictation Component */}
            <VoiceInput
              onTranscript={(transcript) => {
                setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
              }}
            />

            <div className="space-y-1.5">
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => {
                      const n = { ...prev };
                      delete n.description;
                      return n;
                    });
                  }
                }}
                rows={5}
                placeholder="Provide complete facts, sequence of events, and specific relief requested from AICTE (minimum 15 characters)..."
                className="border-slate-300 text-sm leading-relaxed"
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.description}</p>
              )}
            </div>

            {/* Live Duplicate Warning */}
            {potentialDupes.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <span>Samanvay Overlap Engine: Possible Similar Cases Found</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Review to avoid filing redundant grievances. You may still proceed if this is an independent matter.
                </p>
                <div className="space-y-1.5">
                  {potentialDupes.map(({ c, score }) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded bg-white p-2 border border-amber-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-bold text-blue-900">{c.id}</span>
                        <BureauBadge bureau={c.bureau} />
                        <span className="truncate text-slate-600">{c.category}</span>
                      </div>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {Math.round(score * 100)}% match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Evidence Upload */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-950 text-base">4. Evidence &amp; Documents</CardTitle>
            <CardDescription className="text-xs">
              Attach fee challans, admission letters, audio recordings, or photo proofs (Max 25 MB each).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} />
          </CardContent>
        </Card>

        {/* 5. Complainant Identity & Confidential Mode */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-950 text-base flex items-center justify-between">
              <span>5. Complainant Details &amp; Privacy</span>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  isAnonymous
                    ? "border-purple-300 bg-purple-50 text-purple-700 shadow-xs"
                    : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>{isAnonymous ? "Filing Anonymously (Active)" : "File Anonymously"}</span>
              </button>
            </CardTitle>
            <CardDescription className="text-xs">
              {isAnonymous
                ? "Confidential mode enabled: Your name and contact will be encrypted and hidden from normal bureau officers."
                : "Enter your contact info for real-time SMS updates and tracking."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAnonymous ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 space-y-2 text-xs text-purple-950">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <ShieldAlert className="h-4 w-4 text-purple-700" />
                  <span>Confidential Whistleblower Protocol</span>
                </div>
                <p className="leading-relaxed">
                  Your identity is isolated and encrypted with AES-256. It is completely hidden in the grievance queue and can only be audited by the AICTE Chairperson or Admin with a recorded statutory reason.
                </p>
                <p className="font-semibold text-purple-900">
                  You will receive a unique Tracking Access Key on submission to track your grievance securely.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Complainant Full Name</Label>
                  <Input
                    placeholder="Enter full name"
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    className="border-slate-300 text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Mobile Number (for SMS &amp; OTP) <span className="text-red-500">*</span></Label>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={complainantPhone}
                    onChange={(e) => {
                      setComplainantPhone(e.target.value);
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.phone;
                          return n;
                        });
                      }
                    }}
                    className="border-slate-300 text-xs h-9"
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-600 font-medium">{fieldErrors.phone}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Email Address (for official order copies)</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={complainantEmail}
                    onChange={(e) => setComplainantEmail(e.target.value)}
                    className="border-slate-300 text-xs h-9"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 text-sm h-11 shadow-sm"
          >
            <Send className="mr-2 h-4 w-4" />
            {isAnonymous ? "Submit Grievance Anonymously" : "Proceed & Verify OTP"}
          </Button>
          <p className="text-center text-[11px] text-slate-500 mt-2">
            By submitting, you declare that the facts stated above are accurate to the best of your knowledge.
          </p>
        </div>
      </form>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        target={complainantPhone}
        targetType="phone"
        onVerified={executeSubmission}
        onClose={() => setShowOtpModal(false)}
      />
    </div>
  );
}
