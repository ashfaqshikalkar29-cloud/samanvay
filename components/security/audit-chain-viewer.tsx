"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Copy,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AuditBlock {
  block_index: number;
  entry_id: string;
  complaint_id: string;
  action: string;
  actor: {
    id: string;
    name: string;
    role: string;
    bureau?: string;
  };
  timestamp: string;
  details: Record<string, any>;
  details_hash: string;
  previous_hash: string;
  block_hash: string;
  signature: string;
}

interface VerificationResult {
  isValid: boolean;
  totalBlocks: number;
  verifiedAt: string;
  brokenIndex?: number;
  tamperedBlock?: Partial<AuditBlock>;
  errorReason?: string;
  chainHeadHash?: string;
}

export function AuditChainViewer({
  complaintId = "ALL",
  userRole = "Admin",
  onClose,
}: {
  complaintId?: string;
  userRole?: string;
  onClose?: () => void;
}) {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/chain?complaint_id=${complaintId}`, {
        headers: { "x-user-role": userRole },
      });
      const data = await res.json();
      if (data.blocks) {
        setBlocks(data.blocks);
      }
    } catch (err) {
      console.error("Failed to load audit blocks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChain();
  }, [complaintId, userRole]);

  const runVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.verification) {
        setVerification(data.verification);
      }
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const simulateTampering = async () => {
    setTampering(true);
    try {
      const res = await fetch("/api/audit/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          simulateTamper: true,
          blockIndex: blocks.length > 1 ? 1 : 0,
          field: "action",
          value: "ILLEGAL_STAGE_BYPASS_ATTEMPT",
        }),
      });
      const data = await res.json();
      if (data.verification) {
        setVerification(data.verification);
      }
      await fetchChain();
    } catch (err) {
      console.error("Tamper simulation failed:", err);
    } finally {
      setTampering(false);
    }
  };

  const restoreChain = async () => {
    setTampering(true);
    try {
      const res = await fetch("/api/audit/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (data.verification) {
        setVerification(data.verification);
      }
      await fetchChain();
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setTampering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                Cryptographic Hash-Chained Audit Trail
                <span className="text-xs font-mono font-normal text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  SHA-256 Tamper-Evident
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AICTE Grievance Integrity Ledger | Scope: {complaintId === "ALL" ? "Global System Ledger" : complaintId}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
            >
              Close Ledger
            </Button>
          )}
        </div>

        {/* Verification Status Banner */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {verification ? (
                verification.isValid ? (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      Cryptographic Chain Verified Valid (100% Intact, {verification.totalBlocks} Blocks Verified)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md text-xs font-medium">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>
                      TAMPER DETECTED at Block #{verification.brokenIndex}! {verification.errorReason}
                    </span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span>Immutable hash-chain verification ready</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={runVerification}
                disabled={verifying}
                className="text-xs gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-8"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
                Verify Hash Chain Integrity
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={simulateTampering}
                disabled={tampering}
                className="text-xs gap-1.5 border-amber-600 text-amber-700 hover:bg-amber-50 h-8"
              >
                <Bug className="h-3.5 w-3.5" />
                Simulate Malicious Tampering
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={restoreChain}
                disabled={tampering}
                className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 h-8"
              >
                Reset Chain
              </Button>
            </div>
          </div>
        </div>

        {/* Blocks Timeline / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading cryptographic blocks...
            </div>
          ) : blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              No audit blocks recorded for this query.
            </div>
          ) : (
            blocks.map((block, idx) => {
              const isTampered = verification?.isValid === false && verification.brokenIndex === block.block_index;
              const isGenesis = block.block_index === 0;

              return (
                <div
                  key={block.entry_id}
                  className={`rounded-lg border p-4 transition-all ${
                    isTampered
                      ? "border-red-400 bg-red-50/80 shadow-md ring-2 ring-red-300"
                      : "border-slate-200 bg-white shadow-xs hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Block #{block.block_index}
                      </span>
                      {isGenesis ? (
                        <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 text-[10px]">
                          Genesis Block
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-[10px]">
                          {block.action}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Docket: <span className="font-mono">{block.complaint_id}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        Actor: <strong className="text-slate-700">{block.actor.name}</strong> ({block.actor.role})
                      </span>
                      <span>•</span>
                      <span>{new Date(block.timestamp).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Cryptographic Hashes */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                    <div className="rounded bg-slate-50 p-2 border border-slate-100">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" /> Previous Block Hash
                        </span>
                        {isGenesis && <span className="text-purple-600 font-semibold">ROOT (64 Zeros)</span>}
                      </div>
                      <div className="truncate text-slate-600 select-all" title={block.previous_hash}>
                        {block.previous_hash}
                      </div>
                    </div>

                    <div className={`rounded p-2 border ${isTampered ? "bg-red-100/60 border-red-200" : "bg-emerald-50/60 border-emerald-100"}`}>
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                          <Lock className="h-3 w-3 text-emerald-600" /> Current Block Hash (SHA-256)
                        </span>
                        <button
                          onClick={() => copyToClipboard(block.block_hash)}
                          className="hover:text-slate-900 text-[10px] text-slate-500 flex items-center gap-0.5"
                        >
                          <Copy className="h-2.5 w-2.5" />
                          {copiedHash === block.block_hash ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="truncate text-slate-800 font-semibold select-all" title={block.block_hash}>
                        {block.block_hash}
                      </div>
                    </div>
                  </div>

                  {/* Details Payload */}
                  <div className="mt-2.5 rounded bg-slate-900/5 p-2.5 text-[11px] text-slate-700 border border-slate-200/60">
                    <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                      <span>Payload Details</span>
                      <span className="font-mono text-[9px] text-slate-400">
                        Details Hash: {block.details_hash.slice(0, 16)}...
                      </span>
                    </div>
                    <pre className="overflow-x-auto text-[11px] font-mono text-slate-800">
                      {JSON.stringify(block.details, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
