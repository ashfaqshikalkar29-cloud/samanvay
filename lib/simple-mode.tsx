"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface SimpleModeContextType {
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
  simplifyTerm: (term: string) => string;
}

const PLAIN_LANGUAGE_DICTIONARY: Record<string, string> = {
  "Approval Bureau (RB)": "College Approval Office",
  "Approval Bureau": "College Approval Office",
  "RB": "College Approval Office",
  "RB Officer": "College Inspector",
  "Grievance Redressal Cell (PGRC)": "Student Welfare & Complaints Office",
  "Grievance Redressal Cell": "Student Welfare & Complaints Office",
  "PGRC": "Student Welfare & Complaints Office",
  "PGRC Officer": "Student Welfare Officer",
  "Chairperson": "Chief AICTE Authority",
  "SLA": "Guaranteed Resolution Time",
  "SLA Breach": "Overdue Response",
  "SLA Overdue": "Overdue Response",
  "Show-Cause Notice": "Formal Explanation Request Letter",
  "Show-Cause": "Formal Explanation Request",
  "Adjudication": "Final Decision",
  "Inter-bureau Task": "Department Action Request",
  "Disposed": "Resolved & Closed",
  "In-Process": "Currently Being Investigated",
  "Pending": "Waiting for Officer Review",
  "Capitation Fee": "Illegal Extra Donation / Fees",
  "7th CPC": "Mandatory Teacher Pay Scale",
  "Cadre Ratio": "Required Teacher Staffing Ratio",
  "CPGRAMS": "Central Government Portal",
  "DPDP Act 2023": "Digital Personal Data Protection Law",
  "De-Duplication": "Merging Repeated Complaints",
  "Overlap": "Duplicate or Connected Complaint",
  "Recidivism": "Repeat Rule Violations",
  "Scorecard": "College Risk Rating",
};

const SimpleModeContext = createContext<SimpleModeContextType>({
  isSimpleMode: false,
  toggleSimpleMode: () => {},
  simplifyTerm: (term) => term,
});

export const LS_SIMPLE_MODE_KEY = "sam_simple_mode";

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_SIMPLE_MODE_KEY);
      if (saved === "true") {
        setIsSimpleMode(true);
        if (typeof document !== "undefined") {
          document.body.classList.add("sam-simple-mode");
        }
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const toggleSimpleMode = () => {
    setIsSimpleMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_SIMPLE_MODE_KEY, String(next));
        if (typeof document !== "undefined") {
          if (next) {
            document.body.classList.add("sam-simple-mode");
          } else {
            document.body.classList.remove("sam-simple-mode");
          }
        }
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const simplifyTerm = (term: string): string => {
    if (!isSimpleMode || !term) return term;
    return PLAIN_LANGUAGE_DICTIONARY[term] || term;
  };

  return (
    <SimpleModeContext.Provider value={{ isSimpleMode, toggleSimpleMode, simplifyTerm }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  return useContext(SimpleModeContext);
}
