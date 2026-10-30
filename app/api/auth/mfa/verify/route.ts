import { NextRequest, NextResponse } from "next/server";
import { mfaStore } from "@/lib/security/totp";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    if (!hasPermission(auth.role, "mfa:manage")) {
      return NextResponse.json(
        { error: "Access Denied: Role is not authorized to verify MFA." },
        { status: 403 }
      );
    }

    const userId = body.userId || auth.userId;
    const token = body.token || body.code;

    if (!userId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: userId and 6-digit TOTP token are required." },
        { status: 400 }
      );
    }

    const result = mfaStore.verifyAndEnable(userId, token);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "MFA Verification failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      userId,
      isEnabled: true,
      message: "TOTP Multi-Factor Authentication successfully verified and enabled.",
      activatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("MFA Verify Error:", err);
    return NextResponse.json({ error: "Failed to verify MFA token." }, { status: 500 });
  }
}
