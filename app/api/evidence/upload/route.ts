import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES, defaultScanner } from "@/lib/virus-scanner";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was provided in the upload request." }, { status: 400 });
    }

    // 1. Size check (25 MB max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 25 MB limit (file size: ${(file.size / (1024 * 1024)).toFixed(1)} MB).` },
        { status: 400 }
      );
    }

    // 2. MIME & Extension whitelist check
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    const allAllowedMimes = Object.values(ALLOWED_FILE_TYPES).flat();
    const isMimeAllowed = allAllowedMimes.some((allowed) => {
      if (allowed.startsWith(".")) {
        return fileName.endsWith(allowed);
      }
      return fileType === allowed;
    });

    if (!isMimeAllowed) {
      return NextResponse.json(
        {
          error: `File type "${file.type || fileName.split(".").pop()}" is not permitted. Only PDF documents, images (JPG/PNG/WEBP), audio (MP3/WAV), and video (MP4/WEBM) are accepted.`,
        },
        { status: 400 }
      );
    }

    // 3. Virus scanning hook
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const scanResult = await defaultScanner.scan(buffer, file.name);

    if (!scanResult.isClean) {
      return NextResponse.json(
        {
          error: `Security Alert: File "${file.name}" was flagged as potentially malicious (${scanResult.threatName || "Suspicious signature"}) and rejected.`,
        },
        { status: 422 }
      );
    }

    // 4. Generate uploaded file descriptor (in real app, stored to Supabase Storage / S3; for demo, base64 data URL if < 2MB or synthetic reference)
    const fileId = `ev-${crypto.randomUUID()}`;
    let dataUrl = "";
    if (file.size < 2 * 1024 * 1024 && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: dataUrl || `/uploads/${fileId}-${encodeURIComponent(file.name)}`,
        uploaded_at: new Date().toISOString(),
        is_clean: true,
      },
    });
  } catch (err: any) {
    console.error("Evidence upload error:", err);
    return NextResponse.json({ error: "Failed to process upload. Please try again." }, { status: 500 });
  }
}
