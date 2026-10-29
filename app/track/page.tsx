"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, KeyRound, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/ui-bits";

export default function TrackLandingPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState("");
  const [verifyKey, setVerifyKey] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    const trimmedId = trackingId.trim();
    const query = verifyKey.trim() ? `?verify=${encodeURIComponent(verifyKey.trim())}` : "";
    router.push(`/track/${trimmedId}${query}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-10">
      <div className="text-center space-y-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-white mx-auto shadow-md">
          <Search className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-bold text-blue-950">Track Grievance Status</h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Enter your unique Tracking ID (e.g. <span className="font-mono font-bold text-blue-900">SMV-2026-001001</span> or <span className="font-mono font-bold text-blue-900">C-1001</span>) to check live progress across AICTE bureaus.
        </p>
      </div>

      <Card className="border-slate-200 shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Tracking ID or Complaint Docket ID <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  autoFocus
                  placeholder="e.g. SMV-2026-001001 or C-1001"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="pl-9 font-mono text-sm uppercase h-11 border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Phone (Last 4 digits) or Confidential Access Key
                </Label>
                <span className="text-[11px] text-slate-400">Optional for summary</span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Last 4 digits of mobile (e.g. 9812) or AK-XXXX-XXXX"
                  value={verifyKey}
                  onChange={(e) => setVerifyKey(e.target.value)}
                  className="pl-9 text-xs h-10 border-slate-300 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Required only to view full complaint description and attached evidence files.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!trackingId.trim()}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium h-11 shadow-xs"
            >
              Track Grievance →
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-900">Protected Privacy &amp; Data Safeguards</p>
          <p>
            Public tracking displays safe progress milestones only. Complainant identities and confidential whistleblower reports are strictly guarded under AICTE Information Security guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}
