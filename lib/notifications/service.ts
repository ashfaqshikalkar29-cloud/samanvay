// ==============================================================================
// SAMANVAY: Central Notification Service (D. Integrations & C. Alerts)
// Orchestrates multi-channel dispatch, delivery tracking, and notification history
// ==============================================================================

import {
  NotificationAdapter,
  NotificationChannel,
  NotificationPayload,
  NotificationRecord,
} from "./types";
import {
  MockSmsAdapter,
  MockEmailAdapter,
  MockWhatsAppAdapter,
  InAppNotificationAdapter,
} from "./adapters/mock-adapter";

const LS_NOTIFICATIONS = "sam_notification_history";

export const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: "notif-1001",
    complaint_id: "C-1001",
    tracking_id: "SMV-2026-001001",
    recipient_role: "institute",
    recipient_name: "Principal, Maharashtra Institute of Technology",
    recipient_contact: "principal@mitpune.edu.in",
    channel: "email",
    title: "AICTE Statutory Show-Cause Notice: Capitation Fee Allegation",
    message: "Statutory show-cause notice issued under APH Regulations for Docket C-1001. Formal response required within 15 days.",
    priority: "high",
    status: "delivered",
    created_at: "2026-10-03T11:00:00Z",
    receipt: {
      success: true,
      message_id: "email-nic-1001",
      channel: "email",
      dispatched_at: "2026-10-03T11:00:00Z",
      delivered_at: "2026-10-03T11:00:05Z",
      gateway_response: "NIC-MAIL 250 OK",
    },
  },
  {
    id: "notif-1002",
    complaint_id: "C-1001",
    tracking_id: "SMV-2026-001001",
    recipient_role: "complainant",
    recipient_name: "Rajesh Sharma",
    recipient_contact: "+91 98765 43210",
    channel: "sms",
    title: "Grievance Acknowledged - AICTE Samanvay",
    message: "Your grievance SMV-2026-001001 has been registered with AICTE Approval Bureau (RB). Track status at https://samanvay.aicte.gov.in/track/SMV-2026-001001",
    priority: "normal",
    status: "delivered",
    created_at: "2026-10-02T14:30:00Z",
    receipt: {
      success: true,
      message_id: "sms-nic-1002",
      channel: "sms",
      dispatched_at: "2026-10-02T14:30:00Z",
      delivered_at: "2026-10-02T14:30:02Z",
      gateway_response: "CDAC-GW 200 OK",
    },
  },
  {
    id: "notif-1003",
    complaint_id: "C-1002",
    tracking_id: "SMV-2026-001002",
    recipient_role: "complainant",
    recipient_name: "Citizen Complainant",
    recipient_contact: "+91 98123 45678",
    channel: "whatsapp",
    title: "AICTE Grievance Status Update",
    message: "Namaste! Your grievance regarding Fee Refund has advanced to Show-Cause Stage. A formal reply has been demanded from the institution.",
    priority: "normal",
    status: "delivered",
    created_at: "2026-10-10T10:15:00Z",
    receipt: {
      success: true,
      message_id: "wa-aicte-1003",
      channel: "whatsapp",
      dispatched_at: "2026-10-10T10:15:00Z",
      delivered_at: "2026-10-10T10:15:01Z",
      gateway_response: "META-WA 200 OK",
    },
  },
];

export class UnifiedNotificationService {
  private adapters: Map<NotificationChannel, NotificationAdapter> = new Map();
  private history: NotificationRecord[] = [];

  constructor() {
    // Register default pluggable mock adapters
    this.adapters.set("sms", new MockSmsAdapter());
    this.adapters.set("email", new MockEmailAdapter());
    this.adapters.set("whatsapp", new MockWhatsAppAdapter());
    this.adapters.set("in_app", new InAppNotificationAdapter());

    this.initHistory();
  }

  private initHistory() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_NOTIFICATIONS);
        this.history = stored ? JSON.parse(stored) : [...INITIAL_NOTIFICATIONS];
      } catch {
        this.history = [...INITIAL_NOTIFICATIONS];
      }
    } else {
      this.history = [...INITIAL_NOTIFICATIONS];
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(this.history));
      } catch (e) {
        console.error("Failed to persist notification history:", e);
      }
    }
  }

  /**
   * Register or swap an adapter (e.g. plug in real Twilio/NIC Gateway in production)
   */
  registerAdapter(adapter: NotificationAdapter) {
    this.adapters.set(adapter.channel, adapter);
  }

  /**
   * Dispatches a notification through the configured channel adapter
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationRecord> {
    const adapter = this.adapters.get(payload.channel) || this.adapters.get("in_app")!;
    const receipt = await adapter.send(payload);

    const record: NotificationRecord = {
      ...payload,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: receipt.success ? "delivered" : "failed",
      receipt,
      created_at: new Date().toISOString(),
    };

    this.history.unshift(record);
    this.persist();
    return record;
  }

  getNotifications(filter?: {
    complaint_id?: string;
    recipient_role?: string;
    channel?: NotificationChannel;
  }): NotificationRecord[] {
    return this.history.filter((n) => {
      if (filter?.complaint_id && n.complaint_id !== filter.complaint_id) return false;
      if (filter?.recipient_role && n.recipient_role !== filter.recipient_role) return false;
      if (filter?.channel && n.channel !== filter.channel) return false;
      return true;
    });
  }

  markAsRead(notificationId: string): void {
    const item = this.history.find((n) => n.id === notificationId);
    if (item) {
      item.status = "read";
      this.persist();
    }
  }
}

export const defaultNotificationService = new UnifiedNotificationService();
