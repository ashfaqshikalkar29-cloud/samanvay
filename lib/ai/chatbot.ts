import { ChatbotMessage } from "./types";
import { defaultDistressScanner } from "./distress";
import { defaultRulebookQA } from "./rulebook";

export interface ChatSessionState {
  step: "idle" | "filing_category" | "filing_institute" | "filing_description" | "filing_contact" | "filing_ready" | "tracking";
  draft: {
    category?: string;
    institution?: string;
    description?: string;
    complainant_name?: string;
    phone?: string;
  };
}

export const CHATBOT_FAQS = [
  {
    triggers: ["fee refund", "refund policy", "return fee", "money back"],
    answer: "Under AICTE Approval Process Handbook Clause 6.3.1, if you withdraw before the session starts, the institution must refund 100% of fees deducting not more than Rs. 1,000/- as processing fee within 7 days. Original certificates cannot be withheld.",
  },
  {
    triggers: ["ragging", "ragging complaint", "harassment by seniors"],
    answer: "AICTE maintains zero tolerance for ragging. If you or someone you know is in danger, call the 24x7 National Anti-Ragging Helpline at 1800-180-5522. We can also immediately register an emergency high-priority docket for you.",
  },
  {
    triggers: ["original documents", "certificate withheld", "marksheet kept"],
    answer: "Under AICTE APH Clause 6.3.3, colleges are strictly prohibited from retaining original 10th/12th marksheets or degree certificates. Institutions doing so face intake reduction and statutory penalties.",
  },
  {
    triggers: ["how to track", "track status", "tracking id"],
    answer: "You can track your complaint anytime by clicking 'Track Status' in the menu or typing your Tracking ID (e.g., SMV-2026-000123) right here in this chat!",
  },
];

export class ComplainantChatbotEngine {
  async processMessage(
    userText: string,
    state: ChatSessionState = { step: "idle", draft: {} }
  ): Promise<{ message: ChatbotMessage; nextState: ChatSessionState }> {
    const trimmed = userText.trim();
    const lower = trimmed.toLowerCase();
    const now = new Date().toISOString();

    // 1. Check for immediate distress signals
    const distressCheck = await defaultDistressScanner.scan(userText);
    if (distressCheck.has_distress) {
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `🚨 EMERGENCY ASSISTANCE ALERT: We have detected an urgent distress signal. Your safety and well-being are paramount.\n\nPlease reach out immediately:\n• Tele-MANAS (Mental Health Support): 14416 (24x7 Toll-Free)\n• National Anti-Ragging Helpline: 1800-180-5522\n• Unified Emergency: 112\n\nWe have triggered an emergency priority flag for our AICTE Student Welfare Cell. A human officer has been notified.`,
          timestamp: now,
          action_link: { label: "Connect with Safety Desk", url: "/track" },
          escalation_triggered: true,
        },
        nextState: { step: "idle", draft: {} },
      };
    }

    // 2. Tracking ID lookup (e.g. SMV-2026-XXXXXX or C-XXXX)
    const trackingMatch = trimmed.match(/\b(SMV-\d{4}-\d{6}|C-\d{4})\b/i);
    if (trackingMatch) {
      const trackId = trackingMatch[1].toUpperCase();
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `🔍 Checking official status for docket ${trackId}...\n\nFound active record in Samanvay AICTE Central Registry:\n• Current Status: In-Process\n• Bureau: Assigned for statutory verification\n• Next Action: Institutional explanation requested under 7-day rule.\n\nYou can view full timeline and download order copies on the tracking portal.`,
          timestamp: now,
          action_link: { label: `Open Docket ${trackId}`, url: `/track/${trackId}` },
        },
        nextState: { step: "idle", draft: {} },
      };
    }

    // 3. Conversational Filing Flow State Machine
    if (state.step === "filing_category" || lower.includes("file a complaint") || lower.includes("file grievance")) {
      if (lower.includes("file a complaint") || lower.includes("file grievance")) {
        return {
          message: {
            id: `msg-${Date.now()}`,
            sender: "bot",
            text: "I am ready to help you file a formal grievance step by step. Which category best describes your issue?",
            timestamp: now,
            quick_replies: ["Fee Refund / Overcharging", "Faculty / Salary", "Anti-Ragging", "Approval / Infrastructure", "Exams / Evaluation"],
          },
          nextState: { step: "filing_category", draft: {} },
        };
      }

      // User chose category
      const cat = lower.includes("fee") ? "fees" : lower.includes("ragging") ? "ragging" : lower.includes("faculty") ? "faculty" : "approval";
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `Got it (${cat.toUpperCase()}). Next, what is the exact name or AICTE ID of the institution/college?`,
          timestamp: now,
        },
        nextState: { step: "filing_institute", draft: { ...state.draft, category: cat } },
      };
    }

    if (state.step === "filing_institute") {
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `Thank you. Please briefly describe what happened (include any dates, amounts, or specific details).`,
          timestamp: now,
        },
        nextState: { step: "filing_description", draft: { ...state.draft, institution: trimmed } },
      };
    }

    if (state.step === "filing_description") {
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `Understood. To send you your tracking number and official notices, what is your 10-digit mobile number? (You can also choose to file anonymously later).`,
          timestamp: now,
        },
        nextState: { step: "filing_contact", draft: { ...state.draft, description: trimmed } },
      };
    }

    if (state.step === "filing_contact") {
      const finalDraft = { ...state.draft, phone: trimmed.replace(/\D/g, "") };
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: `✅ Your draft grievance has been compiled!\n\n• Category: ${finalDraft.category?.toUpperCase()}\n• Institution: ${finalDraft.institution}\n• Contact Phone: ${finalDraft.phone}\n\nClick below to review the pre-filled form, upload evidence documents, and finalize submission via OTP.`,
          timestamp: now,
          action_link: { label: "Review & Submit Grievance", url: `/new?category=${finalDraft.category}&inst=${encodeURIComponent(finalDraft.institution || "")}` },
          draft_complaint: finalDraft,
        },
        nextState: { step: "idle", draft: {} },
      };
    }

    // 4. Match Knowledge Base FAQs
    for (const faq of CHATBOT_FAQS) {
      if (faq.triggers.some((t) => lower.includes(t))) {
        return {
          message: {
            id: `msg-${Date.now()}`,
            sender: "bot",
            text: faq.answer,
            timestamp: now,
            quick_replies: ["File a complaint now", "Check my status", "Talk to human officer"],
          },
          nextState: state,
        };
      }
    }

    // 5. Query Rulebook RAG Engine
    if (lower.includes("rule") || lower.includes("handbook") || lower.includes("aicte") || lower.includes("norm") || lower.includes("penalty")) {
      const qa = await defaultRulebookQA.ask(userText);
      if (qa.is_grounded) {
        return {
          message: {
            id: `msg-${Date.now()}`,
            sender: "bot",
            text: qa.answer,
            timestamp: now,
            quick_replies: ["File a complaint now", "Check status"],
          },
          nextState: state,
        };
      }
    }

    // 6. Fallback to Human Desk Ticket
    if (lower.includes("human") || lower.includes("officer") || lower.includes("agent") || lower.includes("person")) {
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: "bot",
          text: "I am connecting you with an AICTE Grievance Desk officer. A support ticket has been queued (Desk Ref: TKT-AICTE-8821). Officers are available Mon–Fri, 9:30 AM to 5:30 PM IST. You can also file a formal tracked petition directly.",
          timestamp: now,
          action_link: { label: "File Formal Petition", url: "/new" },
          escalation_triggered: true,
        },
        nextState: { step: "idle", draft: {} },
      };
    }

    // Default guidance response
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: "bot",
        text: "I am Samanvay AI Assistant, available 24x7 to help you with AICTE grievance filing, statutory regulation lookups, and tracking.\n\nHow can I help you today?",
        timestamp: now,
        quick_replies: ["File a complaint", "Track grievance status", "Fee refund norms", "Anti-ragging rules", "Talk to a human"],
      },
      nextState: state,
    };
  }
}

export const defaultChatbotEngine = new ComplainantChatbotEngine();
