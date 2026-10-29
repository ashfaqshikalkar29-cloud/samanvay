export type FieldType = "text" | "number" | "select" | "date" | "textarea";

export interface FormFieldSchema {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText: string;
  options?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string | number;
}

export interface CategorySchema {
  id: string;
  name: string;
  bureau: "RB" | "PGRC";
  description: string;
  fields: FormFieldSchema[];
}

export const CATEGORY_SCHEMAS: Record<string, CategorySchema> = {
  approval: {
    id: "approval",
    name: "Approval / Affiliation",
    bureau: "RB",
    description: "Matters concerning AICTE Extension of Approval (EoA), land norms, intake reduction, or unauthorized courses.",
    fields: [
      {
        id: "academicYear",
        label: "Academic Year Pertaining To",
        type: "select",
        required: true,
        options: ["2026-27", "2025-26", "2024-25"],
        helpText: "Select the relevant AICTE approval cycle for this irregularity.",
      },
      {
        id: "eoaApplicationNumber",
        label: "AICTE EoA Application Number (if available)",
        type: "text",
        required: false,
        placeholder: "e.g., 1-1234567890",
        helpText: "Application reference number from the AICTE Approval portal.",
      },
      {
        id: "violationType",
        label: "Specific Norm Violation",
        type: "select",
        required: true,
        options: [
          "Running unapproved programmes / courses",
          "Excess admissions beyond sanctioned intake",
          "Non-fulfillment of land / built-up area norms",
          "Misrepresentation in AICTE Approval portal application",
          "Shifting campus without prior approval",
        ],
        helpText: "Classify the specific AICTE Approval Process Handbook (APH) clause breach.",
      },
    ],
  },
  fees: {
    id: "fees",
    name: "Fee Regulation & Cap",
    bureau: "PGRC",
    description: "Complaints regarding fee extortion, capitation fees, retention of certificates, or denial of refunds.",
    fields: [
      {
        id: "excessAmountDemanded",
        label: "Excess Amount Demanded / Charged (₹)",
        type: "number",
        required: true,
        placeholder: "e.g., 50000",
        min: 100,
        max: 50000000,
        helpText: "Enter the excess rupee amount charged over state fee regulatory committee caps.",
      },
      {
        id: "certificateRetention",
        label: "Are Original Educational Certificates Withheld?",
        type: "select",
        required: true,
        options: ["Yes - Withheld by institute", "No"],
        helpText: "AICTE strictly prohibits colleges from retaining original certificates of students.",
      },
      {
        id: "feeReceiptNumber",
        label: "Receipt / Challan Number (if paid)",
        type: "text",
        required: false,
        placeholder: "e.g., REC-2026-9812",
        helpText: "Reference number of bank deposit or receipt issued.",
      },
    ],
  },
  faculty: {
    id: "faculty",
    name: "Faculty Norms & Pay Scale",
    bureau: "RB",
    description: "Deficiency in cadre ratio (1:15/1:20), 7th Central Pay Commission non-compliance, or bogus/ghost faculty entries.",
    fields: [
      {
        id: "departmentAffected",
        label: "Department / Departmental Cadre",
        type: "text",
        required: true,
        placeholder: "e.g., Computer Science & Engineering",
        helpText: "Specific engineering/technical department where norms are violated.",
      },
      {
        id: "issueType",
        label: "Nature of Faculty Deficiency",
        type: "select",
        required: true,
        options: [
          "7th CPC salary not paid / signature on forged pay slip",
          "Ghost / biometrically spoofed faculty shown to AICTE inspection",
          "Teacher-to-student ratio heavily violated",
          "Unqualified faculty appointed without required AICTE/UGC credentials",
          "Arbitrary termination without notice or statutory dues",
        ],
        helpText: "Select the primary category of grievance.",
      },
      {
        id: "affectedFacultyCount",
        label: "Approximate Number of Affected Faculty / Students",
        type: "number",
        required: false,
        min: 1,
        placeholder: "e.g., 12",
        helpText: "Total staff or student batch impacted by this violation.",
      },
    ],
  },
  scholarship: {
    id: "scholarship",
    name: "Scholarship & Fellowship Delay",
    bureau: "PGRC",
    description: "Delay or wrongful denial of Pragati, Saksham, Swanath, PG GATE/GPAT scholarships, or PMSSS grants.",
    fields: [
      {
        id: "schemeName",
        label: "Scholarship / Fellowship Scheme",
        type: "select",
        required: true,
        options: [
          "AICTE PG (GATE/GPAT) Fellowship",
          "Pragati Scholarship Scheme for Girl Students",
          "Saksham Scholarship Scheme for Specially-Abled",
          "Swanath Scholarship Scheme",
          "PMSSS (J&K and Ladakh)",
          "Other National / State Scholarship",
        ],
        helpText: "Specific AICTE or national grant under which dues are pending.",
      },
      {
        id: "scholarshipRollNo",
        label: "Student AICTE Student ID / Portal Reg No",
        type: "text",
        required: true,
        placeholder: "e.g., STU-2025-GATE-4401",
        helpText: "Your unique scholarship application ID.",
      },
      {
        id: "monthsDelayed",
        label: "Disbursement Pending For (Months)",
        type: "number",
        required: true,
        min: 1,
        max: 60,
        placeholder: "e.g., 6",
        helpText: "Number of months for which payment is in arrears.",
      },
    ],
  },
  exams: {
    id: "exams",
    name: "Exams & Evaluation Irregularity",
    bureau: "PGRC",
    description: "Withholding admit cards, examination malpractice, revaluation discrepancies, or arbitrary mass failures.",
    fields: [
      {
        id: "examCycle",
        label: "Semester / Exam Session",
        type: "text",
        required: true,
        placeholder: "e.g., Semester VI Even 2025-26",
        helpText: "Term or session when the exam issue occurred.",
      },
      {
        id: "hallTicketWithheld",
        label: "Was Admit Card / Hall Ticket Denied?",
        type: "select",
        required: true,
        options: ["Yes", "No"],
        helpText: "Colleges cannot arbitrarily deny exam entrance tickets without due process.",
      },
    ],
  },
  infrastructure: {
    id: "infrastructure",
    name: "Infrastructure & Lab Deficiencies",
    bureau: "RB",
    description: "Lack of required computer centres, lab machinery, fire safety, barrier-free access for disabled, or library books.",
    fields: [
      {
        id: "deficientFacility",
        label: "Deficient Facility",
        type: "select",
        required: true,
        options: [
          "Laboratory Equipment & Consumables Missing",
          "Computers / High-Speed Internet not functional",
          "Fire Safety NOC / Building Safety expired or missing",
          "Disabled friendly ramps / lifts / washrooms missing",
          "Hostel hygiene & potable drinking water violations",
        ],
        helpText: "Area failing to meet AICTE Minimum Standards.",
      },
      {
        id: "blocksAffected",
        label: "Campus Block / Lab Identifier",
        type: "text",
        required: false,
        placeholder: "e.g., Mechanical Engineering Workshop & Main Block",
        helpText: "Physical location within the campus.",
      },
    ],
  },
  ragging: {
    id: "ragging",
    name: "Ragging & Campus Safety (Priority Escalation)",
    bureau: "PGRC",
    description: "Harassment, physical abuse, psychological torture, or inaction by the College Anti-Ragging Committee.",
    fields: [
      {
        id: "incidentDate",
        label: "Date of Incident / Last Occurrence",
        type: "date",
        required: true,
        helpText: "Approximate date when the incident took place.",
      },
      {
        id: "antiraggingSquadReported",
        label: "Was Complaint lodged with College Anti-Ragging Committee?",
        type: "select",
        required: true,
        options: [
          "Yes - But college took no action or suppressed the matter",
          "No - Fear of retaliation or committee not functional",
        ],
        helpText: "AICTE regulations mandate 24/7 Anti-Ragging committees in every approved institute.",
      },
      {
        id: "locationOfIncident",
        label: "Location of Incident",
        type: "select",
        required: true,
        options: ["College Hostel", "Academic Building / Classroom", "Outside Campus Premises", "Online / Social Media"],
        helpText: "Where the harassment or abuse took place.",
      },
    ],
  },
};

/** Validate dynamic fields against schema */
export function validateDynamicFields(
  categoryKey: string,
  data: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const schema = CATEGORY_SCHEMAS[categoryKey];
  if (!schema) return { valid: true, errors: {} };

  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const val = data[field.id];

    if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
      errors[field.id] = `${field.label} is required.`;
      continue;
    }

    if (val !== undefined && val !== null && String(val).trim() !== "") {
      if (field.type === "number") {
        const num = Number(val);
        if (isNaN(num)) {
          errors[field.id] = `${field.label} must be a number.`;
        } else if (field.min !== undefined && num < field.min) {
          errors[field.id] = `${field.label} must be at least ${field.min}.`;
        } else if (field.max !== undefined && num > field.max) {
          errors[field.id] = `${field.label} cannot exceed ${field.max}.`;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
