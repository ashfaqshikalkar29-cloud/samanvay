// ==============================================================================
// SAMANVAY: Unified Notification Service Types (D. External Adapters & C. Nudges)
// Multi-channel dispatch (SMS, Email, WhatsApp, In-App) with pluggable adapters
// ==============================================================================

export type NotificationChannel = "sms" | "email" | "whatsapp" | "in_app";

export type NotificationPriority = "low" | "normal" | "high" | "emergency";

export type NotificationRecipientRole =
  | "complainant"
  | "institute"
  | "officer"
  | "chairperson"
  | "admin";

export interface NotificationPayload {
  complaint_id: string;
  tracking_id?: string;
  recipient_role: NotificationRecipientRole;
  recipient_name: string;
  recipient_contact: string; // Phone number or email address
  channel: NotificationChannel;
  title: string;
  message: string;
  priority?: NotificationPriority;
  template_id?: string;
  template_params?: Record<string, string>;
  action_url?: string;
}

export interface DeliveryReceipt {
  success: boolean;
  message_id: string;
  channel: NotificationChannel;
  dispatched_at: string;
  delivered_at?: string;
  gateway_response?: string;
  error?: string;
}

export interface NotificationRecord extends NotificationPayload {
  id: string;
  status: "dispatched" | "delivered" | "failed" | "read";
  receipt: DeliveryReceipt;
  created_at: string;
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<DeliveryReceipt>;
}

export interface ProactiveNudge {
  id: string;
  complaint_id: string;
  tracking_id: string;
  target: "institute" | "complainant" | "officer";
  type: "show_cause_50" | "show_cause_80" | "info_request" | "sla_breach_warning";
  trigger_reason: string;
  scheduled_at: string;
  dispatched: boolean;
  notification_payload: NotificationPayload;
}
