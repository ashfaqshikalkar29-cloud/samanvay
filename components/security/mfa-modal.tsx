"use client";

import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  CheckCircle2,
  RefreshCw,
  Lock,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MfaModal({
  userRole = "Admin",
  userId = "officer@aicte-india.org",
  onClose,
}: {
  userRole?: string;
  userId?: string;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<"init" | "verify" | "active">("init");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpInput, setTotpInput] = useState<string>("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // For testing validation once active
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const startSetup = async () => {
    setLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
          "x-user-id": userId,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Failed to start MFA setup.");
        return;
      }
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeDataUrl);
      setBackupCodes(data.backupRecoveryCodes || []);
      setStep("verify");
    } catch (err: any) {
      setVerifyError(err.message || "Network error starting MFA.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!totpInput || totpInput.trim().length !== 6) {
      setVerifyError("Please enter the 6-digit TOTP code from your authenticator app.");
      return;
    }

    setLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
          "x-user-id": userId,
        },
        body: JSON.stringify({ userId, token: totpInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Invalid verification code.");
        return;
      }
      setStep("active");
    } catch (err: any) {
      setVerifyError(err.message || "Network error verifying MFA.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestValidate = async () => {
    if (!testInput.trim()) return;
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/auth/mfa/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: testInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setTestResult(`Validation Failed: ${data.error || "Code invalid"}`);
      } else {
        setTestResult(
          data.isBackupCode
            ? "SUCCESS: Single-use Backup Recovery Code accepted and consumed!"
            : "SUCCESS: 6-digit TOTP token verified successfully!"
        );
      }
    } catch (err: any) {
      setTestResult("Validation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">TOTP Multi-Factor Authentication</h2>
              <p className="text-xs text-slate-400">RFC 6238 Standard | AICTE Statutory Officer Security</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
            >
              Close
            </Button>
          )}
        </div>

        <div className="p-6">
          {step === "init" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Enhance Officer Account Protection
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Configure Time-Based One-Time Password (TOTP) 2FA using Google Authenticator,
                Microsoft Authenticator, or Apple Passwords. Protects grievance adjudication, PII unmasking,
                and regulatory penalty enforcement.
              </p>

              {verifyError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {verifyError}
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={startSetup}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {loading ? "Generating TOTP Credentials..." : "Begin MFA Configuration"}
                </Button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-slate-900">Scan Authenticator QR Code</h3>
                <p className="text-xs text-slate-500">Scan this code with your authenticator mobile application.</p>
              </div>

              {/* QR Code Container */}
              <div className="flex justify-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="TOTP QR Code" className="h-44 w-44 rounded-md shadow-xs" />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Manual Secret Key */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Manual Entry Key (Base32):</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={secret}
                    className="font-mono text-xs bg-slate-50 h-8 select-all"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copySecret}
                    className="h-8 text-xs shrink-0 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedKey ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Recovery Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between font-semibold text-amber-800 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" /> 8 Emergency Backup Recovery Codes:
                    </span>
                    <button
                      onClick={copyBackupCodes}
                      className="text-[11px] text-amber-900 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Download className="h-3 w-3" /> {copiedCodes ? "Copied All" : "Copy All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-amber-900/90">
                    {backupCodes.map((code, idx) => (
                      <span key={idx} className="bg-amber-100/60 px-1.5 py-0.5 rounded text-center">
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700 mt-1.5">
                    Save these codes. Each code can be used once to regain access if you lose your authenticator.
                  </p>
                </div>
              )}

              {/* Enter 6-digit TOTP Token */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-800">
                  Enter 6-Digit Code from Authenticator:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-base tracking-widest h-10 font-bold"
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={loading || totpInput.length !== 6}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 px-5 shrink-0"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
                  </Button>
                </div>
              </div>

              {verifyError && (
                <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  {verifyError}
                </div>
              )}
            </div>
          )}

          {step === "active" && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  TOTP Multi-Factor Authentication Active
                </h3>
                <p className="text-xs text-slate-500">
                  Account <strong className="text-slate-800">{userId}</strong> is now protected by RFC 6238 TOTP.
                </p>
              </div>

              {/* Test Code Verification */}
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-700 block">
                  Test TOTP Code or Backup Recovery Code Validation:
                </span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-digit TOTP or ABCD-1234 backup code"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="font-mono text-xs bg-white h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleTestValidate}
                    disabled={loading || !testInput.trim()}
                    className="h-8 text-xs shrink-0"
                  >
                    Test Validate
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`rounded p-2 text-xs font-medium border ${
                      testResult.startsWith("SUCCESS")
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
