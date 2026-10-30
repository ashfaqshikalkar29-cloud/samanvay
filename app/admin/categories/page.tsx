"use client";

import { useState } from "react";
import {
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  FileText,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CategoryDefinition {
  id: string;
  name: string;
  bureau: "RB" | "PGRC";
  defaultSlaDays: number;
  description: string;
  customFields: { name: string; type: "text" | "number" | "file" | "select"; required: boolean }[];
  isActive: boolean;
}

const INITIAL_CATEGORIES: CategoryDefinition[] = [
  {
    id: "cat-1",
    name: "Fee Regulation & Capitation Refunds",
    bureau: "RB",
    defaultSlaDays: 15,
    description: "Unapproved development fees, capitation fees, or denial of tuition refund upon withdrawal.",
    customFields: [
      { name: "Amount Demanded (₹)", type: "number", required: true },
      { name: "Date of Seat Cancellation", type: "text", required: true },
      { name: "Bank Payment Receipt", type: "file", required: true },
    ],
    isActive: true,
  },
  {
    id: "cat-2",
    name: "Faculty Norms & Salary Disbursal",
    bureau: "RB",
    defaultSlaDays: 21,
    description: "Failure to pay 7th CPC salary, cadre ratio deficiencies, or withholding of service books.",
    customFields: [
      { name: "Months of Unpaid Salary", type: "number", required: true },
      { name: "Designation / Cadre", type: "select", required: true },
      { name: "Appointment Letter Copy", type: "file", required: false },
    ],
    isActive: true,
  },
  {
    id: "cat-3",
    name: "Campus Safety & Anti-Ragging Mandate",
    bureau: "PGRC",
    defaultSlaDays: 7,
    description: "Physical or psychological ragging, hostel safety, or non-constitution of Anti-Ragging Committee.",
    customFields: [
      { name: "Incident Location / Hostel Block", type: "text", required: true },
      { name: "Immediate Medical Attention Needed", type: "select", required: true },
    ],
    isActive: true,
  },
  {
    id: "cat-4",
    name: "Scholarship & Fellowship Disbursal (NSP/PFMS)",
    bureau: "PGRC",
    defaultSlaDays: 15,
    description: "Pragati, Saksham, Swanath, and GATE fellowship non-clearance by College Nodal Officer.",
    customFields: [
      { name: "NSP Application Reference ID", type: "text", required: true },
      { name: "Scheme Name", type: "select", required: true },
    ],
    isActive: true,
  },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDefinition[]>(INITIAL_CATEGORIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newBureau, setNewBureau] = useState<"RB" | "PGRC">("RB");
  const [newSla, setNewSla] = useState(15);
  const [newDesc, setNewDesc] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: CategoryDefinition = {
      id: `cat-${Date.now().toString().slice(-4)}`,
      name: newCatName.trim(),
      bureau: newBureau,
      defaultSlaDays: newSla,
      description: newDesc.trim() || "Statutory technical education grievance category.",
      customFields: [
        { name: "Reference / Registration ID", type: "text", required: true },
        { name: "Supporting Documentary Proof", type: "file", required: false },
      ],
      isActive: true,
    };

    setCategories((prev) => [newCat, ...prev]);
    setShowAddModal(false);
    setNewCatName("");
    setNewDesc("");
    setSuccessMsg(`Category '${newCat.name}' created and assigned to ${newCat.bureau} bureau.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            Platform Configuration · Domain G
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FolderPlus className="h-6 w-6 text-blue-900" />
            No-Code Grievance Category & Field Builder
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure statutory categories, assign bureau jurisdictions (RB vs PGRC), define stage SLA countdowns, and customize intake fields.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white text-xs h-9 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add New Category
        </Button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
              cat.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      cat.bureau === "RB" ? "bg-blue-50 text-blue-900 border-blue-200" : "bg-purple-50 text-purple-900 border-purple-200"
                    }`}
                  >
                    {cat.bureau} Bureau
                  </Badge>
                  <span className="font-mono text-[10px] text-slate-400">{cat.id}</span>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" /> SLA: {cat.defaultSlaDays} Days
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{cat.description}</p>
              </div>

              {/* Custom Fields Preview */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Configured Dynamic Fields:</span>
                <div className="space-y-1">
                  {cat.customFields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-700 font-mono">
                      <span>• {f.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        [{f.type}] {f.required ? "(Required)" : "(Optional)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
              <span className="text-xs font-medium text-slate-500">
                Status: {cat.isActive ? <strong className="text-emerald-700">Active</strong> : <strong className="text-slate-400">Disabled</strong>}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleCategory(cat.id)}
                className="text-xs h-7 border-slate-300"
              >
                {cat.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add New Category */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-blue-900" /> Create Statutory Grievance Category
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAddModal(false)} className="h-7 text-xs">
                ✕
              </Button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Category Name</label>
                <Input
                  placeholder="e.g. Mandatory Biometric Attendance Non-Compliance"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Assigned Bureau</label>
                  <select
                    value={newBureau}
                    onChange={(e) => setNewBureau(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-md bg-white px-3 py-1.5"
                  >
                    <option value="RB">Regulatory / Approval Bureau (RB)</option>
                    <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Statutory SLA Ceiling (Days)</label>
                  <Input
                    type="number"
                    min={3}
                    max={60}
                    value={newSla}
                    onChange={(e) => setNewSla(Number(e.target.value))}
                    required
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Category Description</label>
                <Input
                  placeholder="Statutory scope and applicability guidelines..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-900 text-white">
                  Save Category Definition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
