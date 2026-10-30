import { NextRequest, NextResponse } from "next/server";
import { mfaStore } from "@/lib/security/totp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { error: "Missing required fields: userId and code are required." },
        { status: 400 }
      );
    }

    const result = mfaStore.validateTokenOrBackupCode(userId, code);
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error || "Authentication code invalid." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId,
      isBackupCode: result.isBackupCode || false,
      message: result.isBackupCode
        ? "Backup recovery code validated and permanently consumed."
        : "TOTP 6-digit token successfully validated.",
      validatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("MFA Validation Error:", err);
    return NextResponse.json({ error: "Failed to validate MFA code." }, { status: 500 });
  }
}
