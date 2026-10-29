"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OtpModalProps {
  isOpen: boolean;
  target: string; // phone or email
  targetType: "phone" | "email";
  onVerified: (token: string) => void;
  onClose: () => void;
}

export function OtpModal({ isOpen, target, targetType, onVerified, onClose }: OtpModalProps) {
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Send initial OTP on open
  useEffect(() => {
    if (!isOpen || !target) return;

    let active = true;
    setTimeLeft(300);
    setErrorMsg(null);
    setCode("");

    const sendInitial = async () => {
      try {
        const res = await fetch("/api/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, type: targetType }),
        });
        const data = await res.json();
        if (active) {
          if (res.ok && data.success) {
            if (data.devOtp) setDevOtp(data.devOtp);
          } else {
            setErrorMsg(data.error || "Failed to dispatch verification code.");
          }
        }
      } catch (err) {
        if (active) setErrorMsg("Network error connecting to OTP gateway.");
      }
    };

    sendInitial();

    return () => {
      active = false;
    };
  }, [isOpen, target, targetType]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setErrorMsg("Please enter the full 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onVerified(data.verificationToken || "token-verified");
      } else {
        setErrorMsg(data.error || "Invalid verification code.");
      }
    } catch (err) {
      setErrorMsg("Failed to verify code due to network failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, type: targetType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTimeLeft(300);
        if (data.devOtp) setDevOtp(data.devOtp);
      } else {
        setErrorMsg(data.error || "Failed to resend code.");
      }
    } catch {
      setErrorMsg("Network error resending OTP.");
    } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-900 mb-4">
          <KeyRound className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">Verify Your Identity</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          A 6-digit one-time password (OTP) has been dispatched to{" "}
          <strong className="text-slate-900">{target}</strong>.
        </p>

        {/* Demo mode quick helper badge */}
        {devOtp && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-2.5 text-xs text-blue-900 flex items-center justify-between">
            <div>
              <span className="font-semibold text-blue-950">Demo Test Code: </span>
              <span className="font-mono text-sm font-bold tracking-widest text-blue-700">{devOtp}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCode(devOtp)}
              className="h-6 text-[10px] border-blue-300 bg-white text-blue-800 hover:bg-blue-100"
            >
              Fill Code
            </Button>
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Enter 6-Digit Verification Code
            </label>
            <Input
              autoFocus
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="text-center font-mono text-2xl tracking-[0.5em] h-12 font-bold text-blue-950 border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Expires in: <strong className="text-blue-900 font-mono">{formattedTime}</strong>
            </span>
            <button
              type="button"
              disabled={timeLeft > 0 || resending}
              onClick={handleResend}
              className={`flex items-center gap-1 font-semibold ${
                timeLeft > 0 ? "text-slate-300 cursor-not-allowed" : "text-blue-900 hover:underline"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} /> Resend Code
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying OTP...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm &amp; Submit Grievance
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
