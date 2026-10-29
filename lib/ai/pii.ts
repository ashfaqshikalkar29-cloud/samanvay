import { ExtractedEntities, RedactionResult } from "./types";
import { Role } from "@/lib/mock";

// Regex patterns for Indian PII standards
const REGEX_PATTERNS = {
  phone: /(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{9}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  aadhaar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  pan: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
  amount: /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d{2})?|\b\d{1,3}(?:,\d{2,3})*(?:\s*(?:lakhs?|crores?|thousand|rupees))\b/gi,
  date: /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi,
};

export class PIIService {
  extractEntities(text: string): ExtractedEntities {
    if (!text) {
      return { names: [], institutions: [], dates: [], monetary_amounts: [], phones: [], emails: [], aadhaar_pan: [] };
    }

    const phones = Array.from(text.match(REGEX_PATTERNS.phone) || []);
    const emails = Array.from(text.match(REGEX_PATTERNS.email) || []);
    const aadhaarMatches = Array.from(text.match(REGEX_PATTERNS.aadhaar) || []);
    const panMatches = Array.from(text.match(REGEX_PATTERNS.pan) || []);
    const amounts = Array.from(text.match(REGEX_PATTERNS.amount) || []);
    const dates = Array.from(text.match(REGEX_PATTERNS.date) || []);

    // Simple heuristic for capitalized person names (e.g. "Dr. Ramesh Sharma", "Shri Amit Verma")
    const nameMatches = text.match(/\b(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Shri|Smt\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];

    // Institute mentions (e.g. "Apex Institute", "XYZ College of Engineering")
    const instMatches = text.match(/\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\s+(?:Institute|College|University|Academy|Polytechnic)\b/g) || [];

    return {
      names: Array.from(new Set(nameMatches)),
      institutions: Array.from(new Set(instMatches)),
      dates: Array.from(new Set(dates)),
      monetary_amounts: Array.from(new Set(amounts)),
      phones: Array.from(new Set(phones)),
      emails: Array.from(new Set(emails)),
      aadhaar_pan: Array.from(new Set([...aadhaarMatches, ...panMatches])),
    };
  }

  redact(text: string, viewerRole: Role, isPrivilegedOfficer = false): RedactionResult {
    const entities = this.extractEntities(text);

    // If viewer is Admin, Chairperson, or authorized case officer with privileged flag, return original
    if (viewerRole === "Admin" || viewerRole === "Chairperson" || isPrivilegedOfficer) {
      return {
        original_text: text,
        redacted_text: text,
        entities_found: entities,
        redaction_count: 0,
      };
    }

    let redacted = text;
    let count = 0;

    // Redact Aadhaar & PAN
    redacted = redacted.replace(REGEX_PATTERNS.aadhaar, (match) => {
      count++;
      const clean = match.replace(/[-\s]/g, "");
      return `[AADHAAR: ****-****-${clean.slice(-4)}]`;
    });

    redacted = redacted.replace(REGEX_PATTERNS.pan, (match) => {
      count++;
      return `[PAN: *****${match.slice(-4)}]`;
    });

    // Redact Phone numbers
    redacted = redacted.replace(REGEX_PATTERNS.phone, (match) => {
      count++;
      const digits = match.replace(/\D/g, "");
      return `[PHONE: +91-******${digits.slice(-4)}]`;
    });

    // Redact Emails
    redacted = redacted.replace(REGEX_PATTERNS.email, (match) => {
      count++;
      const [user, domain] = match.split("@");
      const maskedUser = user.length <= 2 ? "**" : `${user[0]}***${user.slice(-1)}`;
      return `[EMAIL: ${maskedUser}@${domain}]`;
    });

    // Mask identified person names
    for (const name of entities.names) {
      const parts = name.split(/\s+/);
      const maskedName = parts.map((p, idx) => idx === 0 ? p : `${p[0]}****`).join(" ");
      redacted = redacted.replaceAll(name, `[PERSON: ${maskedName}]`);
      count++;
    }

    return {
      original_text: text,
      redacted_text: redacted,
      entities_found: entities,
      redaction_count: count,
    };
  }
}

export const defaultPIIService = new PIIService();
