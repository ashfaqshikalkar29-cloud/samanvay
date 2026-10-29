import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "@/lib/otp";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, code } = body;

    if (!target || !code) {
      return NextResponse.json({ error: "Destination and OTP code are required." }, { status: 400 });
    }

    const { valid, reason } = otpStore.verify(target, code);

    if (!valid) {
      return NextResponse.json({ error: reason || "Invalid OTP code." }, { status: 400 });
    }

    // Generate verification token proof
    const token = crypto
      .createHmac("sha256", "samanvay-otp-salt")
      .update(`${target}:${Date.now()}`)
      .digest("hex");

    return NextResponse.json({
      success: true,
      verifiedTarget: target,
      verificationToken: token,
    });
  } catch (err: any) {
    console.error("Error verifying OTP:", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
