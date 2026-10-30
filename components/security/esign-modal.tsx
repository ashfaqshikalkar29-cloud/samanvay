"use client";

import { useState } from "react";
import {
  FileCheck,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Lock,
  QrCode,
  X,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ESignVerification } from "@/lib/integrations/types";
import { Role } from "@/lib/mock";

interface ESignModalProps {
  documentId: string;
  documentTitle: string;
  documentHash: string;
  userRole: Role;
  signerName: string;
  onSigned?: (verification: ESignVerification) => void;
  onClose: () => void;
}

export function ESignModal({
  documentId,
  documentTitle,
  documentHash,
  userRole,
  signerName,
  onSigned,
  onClose,
}: ESignModalProps) {
  const [step, setStep] = useState<"INIT" | "OTP" | "COMPLETED">("INIT");
  const [transactionId, setTransactionId] = useState("");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<ESignVerification | null>(null);

  const handleInitiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/esign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          userRole,
          signerName,
          documentId,
          documentTitle,
          documentHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate eSign");

      setTransactionId(data.transactionId);
      setStep("OTP");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/esign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          userRole,
          transactionId,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "eSign OTP verification failed");

      setVerification(data.verification);
      setStep("COMPLETED");
      if (onSigned) onSigned(data.verification);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">National eSign Authentication</h3>
              <p className="text-[10px] text-slate-500">
                CCA Certified Digital Signature · IT Act 2000 Compliant
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Document Review */}
        {step === "INIT" && (
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="rounded-lg bg-slate-50 p-3 border">
              <div className="text-[10px] uppercase font-bold text-slate-500">Document to Sign</div>
              <div className="font-bold text-slate-900 mt-0.5">{documentTitle}</div>
              <div className="font-mono text-[10px] text-slate-500 mt-1">ID: {documentId}</div>
              <div className="font-mono text-[9px] text-slate-400 mt-0.5 truncate">
                SHA-256: {documentHash}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-200 text-[11px] text-blue-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-700" />
                Statutory Document Locking Guarantee
              </div>
              <p className="text-[10px] text-blue-800 leading-relaxed">
                Applying your digital signature will permanently lock this regulatory order from alteration or back-dating.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInitiate}
                disabled={loading}
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs"
              >
                {loading ? "Connecting to eSign Gateway..." : "Proceed to Aadhaar eSign"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: OTP Entry */}
        {step === "OTP" && (
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="rounded-lg bg-slate-50 p-3 border text-center">
              <KeyRound className="mx-auto h-7 w-7 text-emerald-800 mb-1" />
              <div className="font-bold text-slate-800">Enter 6-Digit Aadhaar OTP</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                OTP dispatched to mobile registered with Aadhaar (Demo OTP: <strong className="text-emerald-700 font-mono">123456</strong>)
              </p>
            </div>

            <div className="pt-2">
              <label className="font-semibold text-slate-700 block mb-1">Aadhaar OTP</label>
              <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center font-mono text-base tracking-widest text-slate-900 font-bold"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setStep("INIT")} className="text-xs">
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs"
              >
                {loading ? "Verifying Signature..." : "Sign & Seal Document"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Completed & QR Seal */}
        {step === "COMPLETED" && verification && (
          <div className="mt-4 space-y-3 text-xs text-slate-600 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm">Document Digitally Signed & Locked</h4>
              <p className="text-[11px] text-slate-500">Signer: {verification.signerName} ({verification.signerRole})</p>
            </div>

            {verification.verificationQrCodeUrl && (
              <div className="mx-auto w-36 rounded-lg border-2 border-emerald-600 p-2 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={verification.verificationQrCodeUrl}
                  alt="eSign Verification QR"
                  className="w-full h-auto"
                />
                <div className="text-[8px] font-mono text-emerald-900 mt-1 font-bold">
                  VERIFIED DIGITAL SEAL
                </div>
              </div>
            )}

            <div className="rounded bg-slate-50 p-2 text-left text-[10px] font-mono text-slate-600 space-y-0.5 border">
              <div>Signature ID: {verification.signatureId}</div>
              <div>Issuer: {verification.certificateIssuer}</div>
              <div>Timestamp: {verification.timestamp}</div>
              <div className="text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                <Lock className="h-3 w-3" /> Status: Tamper-Proof & Locked
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t pt-3">
              <Button
                size="sm"
                onClick={onClose}
                className="bg-blue-950 hover:bg-blue-900 text-white text-xs"
              >
                Close & Return
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
