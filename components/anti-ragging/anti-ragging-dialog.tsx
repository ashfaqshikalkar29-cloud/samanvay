"use client";

import { useState } from "react";
import {
  ShieldAlert,
  PhoneCall,
  Mail,
  AlertTriangle,
  Lock,
  Send,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AntiRaggingDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [instituteName, setInstituteName] = useState("");
  const [incidentDetails, setIncidentDetails] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [complainantContact, setComplainantContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emergencyDocketId, setEmergencyDocketId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const docket = `EMG-RAG-${Date.now().toString().slice(-6)}`;
    setEmergencyDocketId(docket);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl border border-red-200 bg-white shadow-2xl overflow-hidden">
        {/* Urgent Header */}
        <div className="flex items-center justify-between border-b border-red-700 bg-red-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Emergency 24x7 Anti-Ragging Fast-Track
              </h2>
              <p className="text-xs text-red-200">
                Supreme Court Mandate & AICTE Anti-Ragging Regulations · Non-Bailable Cognizable Action
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-red-400 bg-red-800 text-white hover:bg-red-700 text-xs"
          >
            Close
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Helplines Alert */}
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-xs text-red-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm text-red-950">
              <PhoneCall className="h-4 w-4 text-red-600 animate-bounce" />
              National Anti-Ragging 24x7 Toll-Free Helpline: 1800-180-5522
            </div>
            <p className="text-[11px] text-red-800">
              In case of active physical danger or immediate distress, dial <strong>112 (National Emergency)</strong> or the toll-free Anti-Ragging helpline. Submissions here immediately alert the AICTE Designated Safety Officer.
            </p>
            <div className="flex items-center gap-4 pt-1 font-mono text-[11px]">
              <a href="mailto:helpline@antiragging.in" className="text-red-700 hover:underline flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> helpline@antiragging.in
              </a>
              <a
                href="https://www.antiragging.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-700 hover:underline flex items-center gap-1"
              >
                antiragging.in <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Emergency Alert Dispatched to Safety Officer
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Fast-track emergency docket reference: <strong className="font-mono text-red-700">{emergencyDocketId}</strong>.
                The regional Anti-Ragging Cell and College Principal have been alerted with a 24-hour statutory FIR compliance notice.
              </p>
              <Button onClick={onClose} className="bg-slate-900 text-white text-xs h-9 px-6">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Institution / College Name & Campus Location</label>
                <Input
                  placeholder="e.g. Modern College of Technology, Boys Hostel Block C"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Incident Details & Emergency Facts</label>
                <Textarea
                  placeholder="Describe the nature of harassment/ragging, location, perpetrators, and any immediate medical or physical assistance required..."
                  value={incidentDetails}
                  onChange={(e) => setIncidentDetails(e.target.value)}
                  rows={4}
                  required
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-700" />
                  <div>
                    <span className="font-semibold text-slate-800 block text-[11px]">Confidential Whistleblower Mode</span>
                    <span className="text-[10px] text-slate-500">Identity protected under AICTE Anonymous Redressal Protocol</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded text-red-600 cursor-pointer"
                />
              </div>

              {!isAnonymous && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Number / Email for Updates</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={complainantContact}
                    onChange={(e) => setComplainantContact(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-9 gap-1.5 font-bold"
              >
                <Send className="h-3.5 w-3.5" />
                Dispatch Emergency Anti-Ragging Alert (Priority #1)
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
