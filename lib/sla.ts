import { DEMO_TODAY, ESCALATION, SLA_DAYS, type Complaint } from "./mock";

export type SlaState = "On track" | "Due soon" | "Overdue" | "Closed";

export interface SlaInfo {
  due: string;          // YYYY-MM-DD
  daysLeft: number;     // negative = overdue
  state: SlaState;
  escalationLevel: number;  // 0 = none, 1 = L1, 2 = L2
  escalationAuthority: string;
}

function addDays(date: string, n: number): string {
  const d = new Date(Date.parse(date + "T00:00:00Z") + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function getSla(c: Complaint): SlaInfo {
  const slaDays = SLA_DAYS[c.category] ?? 30;
  const due = addDays(c.date_received, slaDays);
  const daysLeft = diffDays(DEMO_TODAY, due);

  if (c.status === "Disposed") {
    return { due, daysLeft, state: "Closed", escalationLevel: 0, escalationAuthority: "" };
  }

  let state: SlaState;
  let escalationLevel = 0;
  let escalationAuthority = "";

  if (daysLeft < 0) {
    state = "Overdue";
    const overdueDays = -daysLeft;
    if (overdueDays > 7) {
      escalationLevel = ESCALATION[1].level;
      escalationAuthority = ESCALATION[1].authority;
    } else {
      escalationLevel = ESCALATION[0].level;
      escalationAuthority = ESCALATION[0].authority;
    }
  } else if (daysLeft <= 5) {
    state = "Due soon";
  } else {
    state = "On track";
  }

  return { due, daysLeft, state, escalationLevel, escalationAuthority };
}
