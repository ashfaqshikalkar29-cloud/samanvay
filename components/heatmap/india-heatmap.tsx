"use client";

import { useState } from "react";
import { MapPin, TrendingUp, ShieldAlert, CheckCircle2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface StateGrievanceData {
  stateCode: string;
  stateName: string;
  totalComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number;
  topCategory: string;
  activeShowCauses: number;
  region: "Western" | "Southern" | "Northern" | "Eastern" | "Central" | "North-West" | "South-West";
}

export const STATE_HEATMAP_DATA: StateGrievanceData[] = [
  { stateCode: "MH", stateName: "Maharashtra", totalComplaints: 284, resolvedComplaints: 242, resolutionRate: 85, topCategory: "Fee Regulation", activeShowCauses: 6, region: "Western" },
  { stateCode: "TN", stateName: "Tamil Nadu", totalComplaints: 241, resolvedComplaints: 210, resolutionRate: 87, topCategory: "Faculty Norms", activeShowCauses: 4, region: "Southern" },
  { stateCode: "UP", stateName: "Uttar Pradesh", totalComplaints: 198, resolvedComplaints: 154, resolutionRate: 78, topCategory: "Scholarship", activeShowCauses: 8, region: "Northern" },
  { stateCode: "KA", stateName: "Karnataka", totalComplaints: 172, resolvedComplaints: 151, resolutionRate: 88, topCategory: "Fee Regulation", activeShowCauses: 3, region: "South-West" },
  { stateCode: "DL", stateName: "Delhi NCR", totalComplaints: 145, resolvedComplaints: 130, resolutionRate: 90, topCategory: "Admission Irregularity", activeShowCauses: 2, region: "Northern" },
  { stateCode: "GJ", stateName: "Gujarat", totalComplaints: 112, resolvedComplaints: 98, resolutionRate: 88, topCategory: "Infrastructure", activeShowCauses: 2, region: "Central" },
  { stateCode: "WB", stateName: "West Bengal", totalComplaints: 96, resolvedComplaints: 74, resolutionRate: 77, topCategory: "Student Services", activeShowCauses: 5, region: "Eastern" },
  { stateCode: "AP", stateName: "Andhra Pradesh", totalComplaints: 134, resolvedComplaints: 112, resolutionRate: 84, topCategory: "Faculty Norms", activeShowCauses: 3, region: "Southern" },
  { stateCode: "TS", stateName: "Telangana", totalComplaints: 128, resolvedComplaints: 110, resolutionRate: 86, topCategory: "Fee Regulation", activeShowCauses: 4, region: "South-West" },
  { stateCode: "KL", stateName: "Kerala", totalComplaints: 84, resolvedComplaints: 78, resolutionRate: 93, topCategory: "Student Services", activeShowCauses: 1, region: "Southern" },
  { stateCode: "MP", stateName: "Madhya Pradesh", totalComplaints: 89, resolvedComplaints: 70, resolutionRate: 79, topCategory: "Scholarship", activeShowCauses: 3, region: "Central" },
  { stateCode: "RJ", stateName: "Rajasthan", totalComplaints: 76, resolvedComplaints: 62, resolutionRate: 82, topCategory: "Hostel & Amenities", activeShowCauses: 2, region: "North-West" },
  { stateCode: "PB", stateName: "Punjab", totalComplaints: 64, resolvedComplaints: 55, resolutionRate: 86, topCategory: "Fee Regulation", activeShowCauses: 1, region: "North-West" },
  { stateCode: "OR", stateName: "Odisha", totalComplaints: 58, resolvedComplaints: 48, resolutionRate: 83, topCategory: "Faculty Norms", activeShowCauses: 2, region: "Eastern" },
  { stateCode: "BR", stateName: "Bihar", totalComplaints: 68, resolvedComplaints: 50, resolutionRate: 74, topCategory: "Scholarship", activeShowCauses: 4, region: "Eastern" },
  { stateCode: "HR", stateName: "Haryana", totalComplaints: 52, resolvedComplaints: 45, resolutionRate: 87, topCategory: "Recognition", activeShowCauses: 1, region: "North-West" },
];

export function IndiaHeatmap({
  onSelectState,
}: {
  onSelectState?: (state: StateGrievanceData) => void;
}) {
  const [selectedState, setSelectedState] = useState<StateGrievanceData>(STATE_HEATMAP_DATA[0]);
  const [bureauFilter, setBureauFilter] = useState<"ALL" | "RB" | "PGRC">("ALL");

  const getIntensityColor = (count: number) => {
    if (count >= 200) return "bg-red-600 text-white border-red-700 shadow-sm";
    if (count >= 120) return "bg-amber-500 text-slate-900 border-amber-600 shadow-xs";
    if (count >= 70) return "bg-blue-600 text-white border-blue-700";
    return "bg-emerald-600 text-white border-emerald-700";
  };

  const getHeatmapHex = (count: number) => {
    if (count >= 200) return "#dc2626";
    if (count >= 120) return "#f59e0b";
    if (count >= 70) return "#2563eb";
    return "#10b981";
  };

  const totalComplaintsNational = STATE_HEATMAP_DATA.reduce((acc, s) => acc + s.totalComplaints, 0);
  const totalResolvedNational = STATE_HEATMAP_DATA.reduce((acc, s) => acc + s.resolvedComplaints, 0);
  const nationalAvgResolution = Math.round((totalResolvedNational / totalComplaintsNational) * 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              National Grievance Intensity Choropleth
              <Badge variant="outline" className="text-[10px] bg-slate-50">
                Pan-India State Map
              </Badge>
            </h3>
            <p className="text-xs text-slate-500">
              State-wise density, resolution efficiency, and active show-cause notices
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
          <span className="flex items-center gap-1 font-medium text-slate-400">
            <Filter className="h-3 w-3" /> Intensity:
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> &gt; 200 (Critical)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 120-199 (High)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> 70-119 (Moderate)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> &lt; 70 (Low)
          </span>
        </div>
      </div>

      {/* Grid of States & Interactive Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* State Choropleth Tiles */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STATE_HEATMAP_DATA.map((state) => {
            const isSelected = selectedState.stateCode === state.stateCode;
            return (
              <button
                key={state.stateCode}
                onClick={() => {
                  setSelectedState(state);
                  if (onSelectState) onSelectState(state);
                }}
                className={`flex flex-col justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-900 ring-2 ring-blue-900/20 bg-blue-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-xs text-slate-900">{state.stateCode}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0`}
                    style={{ backgroundColor: getHeatmapHex(state.totalComplaints) }}
                  />
                </div>
                <div className="text-[11px] font-medium text-slate-600 truncate w-full" title={state.stateName}>
                  {state.stateName}
                </div>
                <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-slate-100 text-[10px]">
                  <span className="font-bold text-slate-800">{state.totalComplaints} cases</span>
                  <span className="text-emerald-700 font-semibold">{state.resolutionRate}% res.</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected State Drilldown Dossier */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedState.region} Regional Office
                </span>
                <h4 className="text-base font-bold text-slate-900">{selectedState.stateName}</h4>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${getIntensityColor(
                  selectedState.totalComplaints
                )}`}
              >
                {selectedState.totalComplaints} Cases
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Resolution Rate</span>
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {selectedState.resolutionRate}%
                </span>
                <span className="text-[9px] text-slate-500">
                  {selectedState.resolvedComplaints} of {selectedState.totalComplaints} closed
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Active Show-Causes</span>
                <span className="text-sm font-bold text-amber-700 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  {selectedState.activeShowCauses}
                </span>
                <span className="text-[9px] text-slate-500">Notices pending reply</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 block font-semibold">Top Grievance Category</span>
              <span className="font-semibold text-slate-900 block">{selectedState.topCategory}</span>
              <p className="text-[10px] text-slate-500">
                Dominant grievance cluster representing ~38% of state intake. Monitored under AICTE Approvals.
              </p>
            </div>
          </div>

          {/* National Comparison Benchmark */}
          <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span>National Benchmark Average:</span>
              <strong className="text-slate-900">{nationalAvgResolution}% Resolution</strong>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-900 h-1.5 rounded-full"
                style={{ width: `${selectedState.resolutionRate}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 block">
              {selectedState.resolutionRate >= nationalAvgResolution ? "Above national benchmark" : "Requires bureau intervention"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
