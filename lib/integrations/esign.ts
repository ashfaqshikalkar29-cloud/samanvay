/**
 * Samanvay AICTE Grievance Portal
 * National eSign Adapter Interface & Mock Implementation (Domain E)
 * Statutory Compliance: Information Technology Act 2000, Sec. 3A & CCA Guidelines
 * Provides digital signature sealing, QR verification, and post-signing document locking.
 */

import { createHash } from "crypto";
import { ESignRequest, ESignVerification } from "./types";
import QRCode from "qrcode";

export interface ESignAdapter {
  initiateSigning(req: ESignRequest): Promise<{ transactionId: string; signingUrl: string }>;
  verifyAndSign(transactionId: string, otp: string): Promise<ESignVerification>;
  verifySignature(
    signatureId: string,
    currentDocumentHash: string
  ): Promise<{ isValid: boolean; isTampered: boolean; verification: ESignVerification | null }>;
}

export class MockESignAdapter implements ESignAdapter {
  private activeTransactions = new Map<string, ESignRequest>();
  private completedSignatures = new Map<string, ESignVerification>();

  async initiateSigning(req: ESignRequest): Promise<{ transactionId: string; signingUrl: string }> {
    const transactionId = `ESIGN-TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.activeTransactions.set(transactionId, req);

    return {
      transactionId,
      signingUrl: `https://esign.gov.in/auth/mock-gateway?tx=${transactionId}`,
    };
  }

  async verifyAndSign(transactionId: string, otp: string): Promise<ESignVerification> {
    const req = this.activeTransactions.get(transactionId);
    if (!req) {
      throw new Error(`eSign transaction ${transactionId} not found or expired.`);
    }

    if (otp !== "123456" && otp !== "000000" && otp.length !== 6) {
      throw new Error("Invalid Aadhaar OTP provided for eSign verification.");
    }

    const timestamp = new Date().toISOString();
    const signatureId = `ESIGN-SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Cryptographic tamper seal combining document hash + signer + timestamp
    const tamperSealHash = createHash("sha256")
      .update(`${req.documentHashSha256}|${req.signerName}|${timestamp}|${signatureId}`)
      .digest("hex");

    // Verification QR payload
    const verificationUrl = `https://samanvay.aicte-india.org/verify/esign/${signatureId}?doc=${req.documentId}&seal=${tamperSealHash.slice(0, 16)}`;
    let verificationQrCodeUrl = "";
    try {
      verificationQrCodeUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "H",
        width: 180,
      });
    } catch {
      verificationQrCodeUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50">QR_ESIGN</text></svg>`;
    }

    const verification: ESignVerification = {
      signatureId,
      documentId: req.documentId,
      signerName: req.signerName,
      signerRole: req.signerRole,
      timestamp,
      certificateIssuer: "eMudhra / CDAC National eSign CA 2026 (Govt of India)",
      verificationQrCodeUrl,
      isDocumentLocked: true,
      tamperSealHash,
    };

    this.completedSignatures.set(signatureId, verification);
    this.activeTransactions.delete(transactionId);

    return verification;
  }

  async verifySignature(
    signatureId: string,
    currentDocumentHash: string
  ): Promise<{ isValid: boolean; isTampered: boolean; verification: ESignVerification | null }> {
    const verification = this.completedSignatures.get(signatureId);
    if (!verification) {
      return { isValid: false, isTampered: false, verification: null };
    }

    // Recompute seal
    const expectedSeal = createHash("sha256")
      .update(`${currentDocumentHash}|${verification.signerName}|${verification.timestamp}|${signatureId}`)
      .digest("hex");

    const isTampered = expectedSeal !== verification.tamperSealHash;

    return {
      isValid: !isTampered,
      isTampered,
      verification,
    };
  }

  getSignature(signatureId: string): ESignVerification | undefined {
    return this.completedSignatures.get(signatureId);
  }
}

export const defaultESignAdapter = new MockESignAdapter();
