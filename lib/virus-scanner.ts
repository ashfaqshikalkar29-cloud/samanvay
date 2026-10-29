export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  document: ["application/pdf", ".pdf"],
  image: ["image/jpeg", "image/png", "image/webp", ".jpg", ".jpeg", ".png", ".webp"],
  audio: ["audio/mpeg", "audio/wav", "audio/mp3", ".mp3", ".wav"],
  video: ["video/mp4", "video/webm", ".mp4", ".webm"],
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface ScanResult {
  isClean: boolean;
  threatName?: string;
  scannedAt: string;
  engine: string;
}

export interface VirusScanner {
  scan(fileBuffer: Buffer | Uint8Array, fileName: string): Promise<ScanResult>;
}

/** Default ClamAV Stub scanner for testing & local development */
export class ClamAVStubScanner implements VirusScanner {
  async scan(fileBuffer: Buffer | Uint8Array, fileName: string): Promise<ScanResult> {
    // EICAR standard anti-virus test signature check
    const eicarSignature = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
    const content = Buffer.from(fileBuffer).toString("ascii", 0, Math.min(fileBuffer.length, 1024));

    if (content.includes(eicarSignature) || fileName.toLowerCase().includes("virus_test")) {
      return {
        isClean: false,
        threatName: "Eicar-Test-Signature",
        scannedAt: new Date().toISOString(),
        engine: "ClamAV (Stub/Simulated)",
      };
    }

    return {
      isClean: true,
      scannedAt: new Date().toISOString(),
      engine: "ClamAV (Stub/Simulated)",
    };
  }
}

export const defaultScanner = new ClamAVStubScanner();

/** Client-side image compression helper */
export async function compressImage(file: File, maxDimension = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file); // Don't use if compression didn't reduce size
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
