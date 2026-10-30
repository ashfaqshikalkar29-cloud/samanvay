import { NextRequest, NextResponse } from "next/server";
import {
  generateTotpSecret,
  getOtpAuthUrl,
  generateQrCodeDataUrl,
  generateRecoveryCodes,
  mfaStore,
} from "@/lib/security/totp";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    if (!hasPermission(auth.role, "mfa:manage")) {
      return NextResponse.json(
        { error: "Access Denied: Role is not authorized to configure MFA." },
        { status: 403 }
      );
    }

    const userId = body.userId || auth.userId || "officer@aicte-india.org";
    const secret = generateTotpSecret();
    const otpAuthUrl = getOtpAuthUrl(userId, secret);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);
    const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

    // Save as pending MFA setup in store
    mfaStore.savePendingSetup(userId, secret, hashedCodes);

    return NextResponse.json({
      success: true,
      userId,
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
      backupRecoveryCodes: plainCodes,
      instructions: [
        "1. Scan the QR code using Google Authenticator, Microsoft Authenticator, or 2FAS.",
        "2. Alternatively, enter the Secret Key manually in your authenticator app.",
        "3. Store your 8 Backup Recovery Codes in a secure password manager.",
        "4. Submit a 6-digit TOTP code to /api/auth/mfa/verify to complete activation.",
      ],
    });
  } catch (err: any) {
    console.error("MFA Setup Error:", err);
    return NextResponse.json({ error: "Failed to initialize MFA setup." }, { status: 500 });
  }
}
