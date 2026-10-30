"use client";

import { useState, useEffect } from "react";
import {
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureFlag } from "@/lib/feature-flags";

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [message, setMessage] = useState<string | null>(null);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      const data = await res.json();
      if (data.flags) {
        setFlags(data.flags);
      }
    } catch (err) {
      console.error("Failed to fetch flags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const toggleFlag = async (flag: FeatureFlag) => {
    setUpdatingKey(flag.key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "Admin",
        },
        body: JSON.stringify({
          key: flag.key,
          isEnabled: !flag.isEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok && data.flag) {
        setFlags((prev) => prev.map((f) => (f.key === flag.key ? data.flag : f)));
        setMessage(`Feature flag '${flag.name}' successfully ${data.flag.isEnabled ? "ENABLED" : "DISABLED"}.`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(data.error || "Failed to update flag.");
      }
    } catch {
      alert("Network error updating feature flag.");
    } finally {
      setUpdatingKey(null);
    }
  };

  const categories = ["ALL", "AI & ML", "Integrations", "Security & DPDP", "Workflows", "Accessibility"];

  const filtered = flags.filter((f) => selectedCategory === "ALL" || f.category === selectedCategory);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            Platform Configuration · Domain G
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders className="h-6 w-6 text-blue-900" />
            Dynamic Platform Feature Flags
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time toggles for AI de-duplication, automated routing, video hearing convocations, and DPDP field encryption.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchFlags}
          disabled={loading}
          className="text-xs gap-1.5 h-8 border-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs h-8 ${
              selectedCategory === cat ? "bg-blue-900 text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Flags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((flag) => {
          const isUpdating = updatingKey === flag.key;
          return (
            <div
              key={flag.key}
              className={`rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                flag.isEnabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/70 opacity-80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] bg-slate-50 font-semibold">
                    {flag.category}
                  </Badge>
                  <span className="font-mono text-[10px] text-slate-400">{flag.key}</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900">{flag.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{flag.description}</p>

                {flag.allowedRoles && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Roles:</span>
                    {flag.allowedRoles.map((r) => (
                      <span key={r} className="rounded bg-blue-50 text-blue-900 px-1.5 py-0.2 text-[9px] font-mono border border-blue-200">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {flag.isEnabled ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-slate-400" /> Disabled
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleFlag(flag)}
                  disabled={isUpdating}
                  className={`text-xs h-8 gap-1.5 cursor-pointer ${
                    flag.isEnabled
                      ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {isUpdating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : flag.isEnabled ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-600" /> Enabled
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-slate-400" /> Disabled
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
