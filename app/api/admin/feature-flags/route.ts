import { NextRequest, NextResponse } from "next/server";
import { featureFlagManager } from "@/lib/feature-flags";
import { extractAuthContext } from "@/lib/security/rbac";

export async function GET(req: NextRequest) {
  try {
    const flags = featureFlagManager.getAllFlags();
    return NextResponse.json({ success: true, count: flags.length, flags });
  } catch (err: any) {
    console.error("Feature Flags Query Error:", err);
    return NextResponse.json({ error: "Failed to fetch feature flags." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    // Only Admin can modify platform feature flags
    if (auth.role !== "Admin") {
      return NextResponse.json(
        { error: "Access Denied: Only Admin role can modify platform feature flags." },
        { status: 403 }
      );
    }

    const { key, isEnabled, allowedRoles, environmentOverrides } = body;
    if (!key) {
      return NextResponse.json({ error: "Feature flag key is required." }, { status: 400 });
    }

    const updated = featureFlagManager.setFlag(
      key,
      {
        ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
        ...(allowedRoles !== undefined ? { allowedRoles } : {}),
        ...(environmentOverrides !== undefined ? { environmentOverrides } : {}),
      },
      auth.userId || "Admin Console"
    );

    if (!updated) {
      return NextResponse.json({ error: "Feature flag not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Feature flag '${key}' updated successfully.`,
      flag: updated,
    });
  } catch (err: any) {
    console.error("Feature Flags Update Error:", err);
    return NextResponse.json({ error: "Failed to update feature flag." }, { status: 500 });
  }
}
