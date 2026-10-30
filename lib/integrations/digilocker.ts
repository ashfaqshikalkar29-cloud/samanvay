/**
 * Samanvay AICTE Grievance Portal
 * DigiLocker OAuth 2.0 Identity Verification Adapter (Domain D)
 * Simulates DigiLocker KYC consent flow, verifying complainant demographic credentials (Aadhaar / APAAR / ABC ID)
 * and conferring verified citizen trust badges to eliminate frivolous submissions.
 */

import { DigiLockerProfile } from "./types";

class DigiLockerAdapter {
  private verifiedProfiles = new Map<string, DigiLockerProfile>();

  constructor() {
    // Seed sample profiles
    this.verifiedProfiles.set("DL-IN-9821-4901", {
      digilocker_id: "DL-IN-9821-4901",
      full_name: "Ananya Ramesh Sharma",
      dob: "2003-08-14",
      gender: "F",
      masked_aadhaar: "XXXXXXXX4912",
      verified_mobile: "+91 98765 43210",
      is_verified: true,
      verified_at: "2026-10-01T10:15:00Z",
      certificate_type: "APAAR ID",
    });
  }

  /**
   * Generate DigiLocker Consent Flow Authorization URL
   */
  getAuthorizationUrl(complaintId: string, redirectUri: string): { authUrl: string; state: string } {
    const state = `dl-state-${Date.now()}-${complaintId}`;
    const authUrl = `https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?response_type=code&client_id=AICTE_SAMANVAY_PORTAL&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=Aadhaar,APAAR_ID`;
    return { authUrl, state };
  }

  /**
   * Complete mock OAuth token exchange and fetch verified demographic profile
   */
  async exchangeConsentCode(
    authCode: string,
    complaintId: string,
    providedName?: string
  ): Promise<DigiLockerProfile> {
    const verifiedName = providedName || "Ananya Ramesh Sharma";
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const profile: DigiLockerProfile = {
      digilocker_id: `DL-IN-${Date.now().toString().slice(-4)}-${last4}`,
      full_name: verifiedName,
      dob: "2003-05-18",
      gender: "F",
      masked_aadhaar: `XXXXXXXX${last4}`,
      verified_mobile: "+91 98765 43210",
      is_verified: true,
      verified_at: new Date().toISOString(),
      certificate_type: "APAAR ID",
    };

    this.verifiedProfiles.set(complaintId, profile);
    return profile;
  }

  /**
   * Get verification status for a grievance docket
   */
  getProfileForComplaint(complaintId: string): DigiLockerProfile | undefined {
    return this.verifiedProfiles.get(complaintId);
  }
}

export const digiLockerAdapter = new DigiLockerAdapter();
