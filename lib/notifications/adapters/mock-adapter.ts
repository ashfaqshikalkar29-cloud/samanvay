// ==============================================================================
// SAMANVAY: Mock Notification Adapters (D. External Integration Adapters)
// Pluggable implementations for SMS (NIC/CDAC), Email (NIC Mail), and WhatsApp
// ==============================================================================

import {
  NotificationAdapter,
  NotificationChannel,
  NotificationPayload,
  DeliveryReceipt,
} from "../types";

/**
 * Mock SMS Adapter simulating Government of India CDAC / NIC SMS Gateway
 */
export class MockSmsAdapter implements NotificationAdapter {
  readonly channel: NotificationChannel = "sms";

  async send(payload: NotificationPayload): Promise<DeliveryReceipt> {
    const timestamp = new Date().toISOString();
    const messageId = `sms-nic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Simulate SMS gateway network processing latency
    await new Promise((r) => setTimeout(r, 10));

    return {
      success: true,
      message_id: messageId,
      channel: "sms",
      dispatched_at: timestamp,
      delivered_at: timestamp,
      gateway_response: `CDAC-GW 200 OK: Delivered to ${payload.recipient_contact} (DLT Template ID: 14071612345678)`,
    };
  }
}

/**
 * Mock Email Adapter simulating NIC Gov Mail / Amazon SES Gateway
 */
export class MockEmailAdapter implements NotificationAdapter {
  readonly channel: NotificationChannel = "email";

  async send(payload: NotificationPayload): Promise<DeliveryReceipt> {
    const timestamp = new Date().toISOString();
    const messageId = `email-nic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await new Promise((r) => setTimeout(r, 10));

    return {
      success: true,
      message_id: messageId,
      channel: "email",
      dispatched_at: timestamp,
      delivered_at: timestamp,
      gateway_response: `NIC-MAIL 250 2.0.0 OK: Queued for delivery to ${payload.recipient_contact}`,
    };
  }
}

/**
 * Mock WhatsApp Adapter simulating AICTE Official WhatsApp Business Gateway
 */
export class MockWhatsAppAdapter implements NotificationAdapter {
  readonly channel: NotificationChannel = "whatsapp";

  async send(payload: NotificationPayload): Promise<DeliveryReceipt> {
    const timestamp = new Date().toISOString();
    const messageId = `wa-aicte-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await new Promise((r) => setTimeout(r, 10));

    return {
      success: true,
      message_id: messageId,
      channel: "whatsapp",
      dispatched_at: timestamp,
      delivered_at: timestamp,
      gateway_response: `META-WA 200 OK: Template message delivered to WhatsApp user ${payload.recipient_contact}`,
    };
  }
}

/**
 * In-App Notification Adapter for real-time web portal notifications
 */
export class InAppNotificationAdapter implements NotificationAdapter {
  readonly channel: NotificationChannel = "in_app";

  async send(payload: NotificationPayload): Promise<DeliveryReceipt> {
    const timestamp = new Date().toISOString();
    const messageId = `inapp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      message_id: messageId,
      channel: "in_app",
      dispatched_at: timestamp,
      delivered_at: timestamp,
      gateway_response: `In-App notification posted for role ${payload.recipient_role}`,
    };
  }
}
