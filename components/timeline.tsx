"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Filter,
  MessageSquarePlus,
  Send,
  Calendar,
  AlertTriangle,
  GitMerge,
  FileText,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store";
import { ACTOR, type Bureau } from "@/lib/mock";
import {
  CaseEvent,
  EventType,
  EVENT_TYPE_CONFIG,
  BUREAU_COLORS,
} from "@/lib/timeline";
import { fmtDateTime } from "@/components/ui-bits";

export function UnifiedTimeline({
  complaintId,
  readOnly = false,
}: {
  complaintId: string;
  readOnly?: boolean;
}) {
  const { getEvents, addEvent, role } = useApp();
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [bureauFilter, setBureauFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Add event form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<EventType>("note");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await getEvents(complaintId);
      setEvents(res);
    } catch (e) {
      console.error("Failed to load timeline events:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [complaintId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSubmitting(true);
    const actorBureau: Bureau | "System" =
      role === "RB Officer" ? "RB" : role === "PGRC Officer" ? "PGRC" : "System";

    const newEvt: CaseEvent = {
      id: `evt-${Date.now()}`,
      complaint_id: complaintId,
      bureau: actorBureau,
      event_type: newType,
      actor: ACTOR[role] || "Officer",
      title: newTitle.trim(),
      description: newDesc.trim(),
      created_at: new Date().toISOString(),
    };

    await addEvent(newEvt);
    setNewTitle("");
    setNewDesc("");
    setShowAddModal(false);
    setIsSubmitting(false);
    await loadEvents();
  };

  const filteredEvents = events.filter((evt) => {
    if (bureauFilter !== "All" && evt.bureau !== bureauFilter) return false;
    if (typeFilter !== "All" && evt.event_type !== typeFilter) return false;
    return true;
  });

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-950 text-base">
              <Clock className="h-4 w-4 text-blue-800" /> Unified Cross-Bureau Timeline
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological log of proceedings, hearings, notices, and internal notes across all bureaus
            </CardDescription>
          </div>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-blue-300 text-blue-900 hover:bg-blue-50"
              onClick={() => setShowAddModal(true)}
            >
              <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" /> Log Event / Note
            </Button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="h-3 w-3" /> Filters:
          </div>

          <Select value={bureauFilter} onValueChange={(v) => { if (v) setBureauFilter(v); }}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Bureau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Bureaus</SelectItem>
              <SelectItem value="RB">Regional Bureau (RB)</SelectItem>
              <SelectItem value="PGRC">PGRC Bureau</SelectItem>
              <SelectItem value="System">System & Gateway</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v); }}>
            <SelectTrigger className="h-7 w-[150px] text-xs">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Event Types</SelectItem>
              <SelectItem value="status_change">Status Transitions</SelectItem>
              <SelectItem value="note">Internal Notes</SelectItem>
              <SelectItem value="notice">Formal Notices</SelectItem>
              <SelectItem value="hearing">Statutory Hearings</SelectItem>
              <SelectItem value="task">Inter-Bureau Tasks</SelectItem>
              <SelectItem value="merge">Merges & Duplicates</SelectItem>
              <SelectItem value="conflict">Contradiction Alerts</SelectItem>
            </SelectContent>
          </Select>

          {(bureauFilter !== "All" || typeFilter !== "All") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-slate-500 px-2"
              onClick={() => {
                setBureauFilter("All");
                setTypeFilter("All");
              }}
            >
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-[11px] text-slate-400">
            {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-center py-6 text-xs text-slate-400">Loading timeline...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No events match the selected filter criteria.
          </div>
        ) : (
          <ol className="relative ml-3 space-y-6 border-l-2 border-slate-200 pl-6 my-2">
            {filteredEvents.map((evt) => {
              const typeCfg = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.note;
              const bureauColors = BUREAU_COLORS[evt.bureau] || BUREAU_COLORS.System;

              return (
                <li key={evt.id} className="relative group">
                  {/* Pin Dot */}
                  <span
                    className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white"
                    style={{ backgroundColor: typeCfg.color }}
                  />

                  <div className="space-y-1.5 rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bureauColors.bg} ${bureauColors.text} ring-1 ring-inset ${bureauColors.ring}`}
                        >
                          {evt.bureau}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-medium ${typeCfg.badgeClass}`}
                        >
                          {typeCfg.label}
                        </span>
                        <p className="text-xs font-semibold text-slate-900">{evt.title}</p>
                      </div>
                      <time className="text-[11px] text-slate-400 font-mono">
                        {fmtDateTime(evt.created_at)}
                      </time>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {evt.description}
                    </p>

                    <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="font-medium text-slate-600">{evt.actor}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>

      {/* Log Event Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <p className="text-base font-semibold text-slate-900">Log Case Event / Internal Note</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Recorded into the unified cross-bureau timeline for case {complaintId}
              </p>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className="space-y-4 px-6 py-4">
                <div className="space-y-1.5">
                  <Label>Event Category</Label>
                  <Select value={newType} onValueChange={(v) => { if (v) setNewType(v as EventType); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Internal Bureau Note</SelectItem>
                      <SelectItem value="notice">Formal Notice / Order Issued</SelectItem>
                      <SelectItem value="hearing">Hearing Sitting / Minutes</SelectItem>
                      <SelectItem value="status_change">Progress Check / Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Event Headline / Subject <span className="text-red-500">*</span></Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Show-Cause Notice Dispatched to Principal"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Detailed Remarks / Record <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Enter meeting notes, file reference number, or action details..."
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim() || !newDesc.trim()}
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {isSubmitting ? "Logging..." : "Append to Timeline"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
