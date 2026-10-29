"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, Check, ChevronsUpDown, Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Institution } from "@/lib/mock";

interface InstituteComboboxProps {
  value: string; // institute ID
  onSelect: (inst: Institution) => void;
  className?: string;
}

export function InstituteCombobox({ value, onSelect, className }: InstituteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [institutes, setInstitutes] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial list / search results debounced
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/institutes/search?q=${encodeURIComponent(query)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setInstitutes(data.institutes || []);
            if (value && !selectedInst) {
              const matched = (data.institutes as Institution[]).find((i) => i.id === value || i.aicte_id === value);
              if (matched) setSelectedInst(matched);
            }
          }
        }
      } catch (err) {
        console.error("Institute search error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, value, selectedInst]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {/* Search trigger box */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
        className="flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
      >
        {selectedInst ? (
          <div className="flex flex-col text-left">
            <span className="font-medium text-slate-900 line-clamp-1">{selectedInst.name}</span>
            <span className="text-xs text-slate-500">
              AICTE ID: <strong className="text-blue-900">{selectedInst.aicte_id}</strong> · {selectedInst.district || selectedInst.region}, {selectedInst.state || ""}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">Search AICTE approved institute by name or ID…</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                autoFocus
                placeholder="Type institute name, AICTE ID, city, or state..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9 text-xs border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {loading && (
              <div className="flex items-center justify-center p-4 text-xs text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-900" /> Searching AICTE repository...
              </div>
            )}

            {!loading && institutes.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No institutions found matching &ldquo;{query}&rdquo;.
              </div>
            )}

            {!loading &&
              institutes.map((inst) => {
                const isSelected = selectedInst?.id === inst.id;
                return (
                  <div
                    key={inst.id}
                    onClick={() => {
                      setSelectedInst(inst);
                      onSelect(inst);
                      setOpen(false);
                    }}
                    className={`flex cursor-pointer items-start justify-between p-3 text-xs transition-colors hover:bg-blue-50/70 ${
                      isSelected ? "bg-blue-50 font-medium text-blue-950" : "text-slate-700"
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Building2 className="h-3.5 w-3.5 text-blue-900 shrink-0" />
                        <span className="font-semibold text-slate-900">{inst.name}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 py-0 px-1.5">
                          ID: {inst.aicte_id}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {inst.district}, {inst.state} ({inst.region} Region)
                        </span>
                      </div>

                      {inst.programmes && inst.programmes.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {inst.programmes.slice(0, 3).map((p) => (
                            <span key={p} className="rounded bg-blue-100/60 px-1.5 py-0.2 text-[10px] text-blue-800">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-blue-900 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
