import { NextRequest, NextResponse } from "next/server";
import { otpStore, notificationService } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, type = "phone" } = body;

    if (!target || typeof target !== "string" || target.trim().length < 4) {
      return NextResponse.json({ error: "Invalid phone number or email address." }, { status: 400 });
    }

    const cleanTarget = target.trim();
    if (type === "phone" && !/^\+?[0-9]{10,13}$/.test(cleanTarget.replace(/\s+/g, ""))) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTarget)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const { code, expiresAt, error } = otpStore.generate(cleanTarget);
    if (error) {
      return NextResponse.json({ error }, { status: 429 });
    }

    const message = `Your Samanvay AICTE grievance verification code is: ${code}. Valid for 5 minutes. Do not share this OTP.`;

    if (type === "phone") {
      await notificationService.sendSms(cleanTarget, message);
    } else {
      await notificationService.sendEmail(cleanTarget, "Samanvay Verification Code", message);
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to ${cleanTarget}`,
      expiresAt,
      // Provide preview in development/demo mode for easy testing:
      devOtp: code,
    });
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
