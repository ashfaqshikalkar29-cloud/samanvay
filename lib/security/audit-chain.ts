/**
 * Samanvay AICTE Grievance Portal
 * Cryptographic Hash-Chained Audit Trail
 * Implements tamper-evident blockchain-style hash linking (SHA-256)
 * with HMAC signature verification and automated integrity audits.
 */

import crypto from "crypto";
import { Role } from "@/lib/mock";

export const GENESIS_PREV_HASH = "0".repeat(64);
const AUDIT_SIGNING_SECRET = process.env.AUDIT_SIGNING_SECRET || "samanvay-aicte-tamper-proof-audit-hmac-key-2026";

export interface AuditActor {
  id: string;
  name: string;
  role: Role;
  bureau?: string;
}

export interface AuditBlock {
  block_index: number;
  entry_id: string;
  complaint_id: string;
  action: string;
  actor: AuditActor;
  timestamp: string;
  details: Record<string, any>;
  details_hash: string;
  previous_hash: string;
  block_hash: string;
  signature: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalBlocks: number;
  verifiedAt: string;
  brokenIndex?: number;
  tamperedBlock?: Partial<AuditBlock>;
  errorReason?: string;
  chainHeadHash?: string;
}

/**
 * Compute SHA-256 hash of arbitrary string or object
 */
export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Compute canonical hash of details payload
 */
export function computeDetailsHash(details: Record<string, any>): string {
  // Sort keys for deterministic JSON serialization
  const keys = Object.keys(details || {}).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of keys) {
    sortedObj[k] = details[k];
  }
  return sha256(JSON.stringify(sortedObj));
}

/**
 * Compute block hash from its cryptographic headers and content
 */
export function computeBlockHash(
  previousHash: string,
  blockIndex: number,
  entryId: string,
  complaintId: string,
  action: string,
  detailsHash: string,
  timestamp: string,
  actor: AuditActor
): string {
  const payload = [
    previousHash,
    blockIndex.toString(),
    entryId,
    complaintId,
    action,
    detailsHash,
    timestamp,
    `${actor.id}:${actor.role}:${actor.bureau || "ALL"}`,
  ].join("|");

  return sha256(payload);
}

/**
 * Sign block hash using server-side HMAC
 */
export function signBlockHash(blockHash: string): string {
  return crypto.createHmac("sha256", AUDIT_SIGNING_SECRET).update(blockHash).digest("hex");
}

/**
 * Verify HMAC signature of block hash
 */
export function verifyBlockSignature(blockHash: string, signature: string): boolean {
  const expected = signBlockHash(blockHash);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

class AuditChainLedger {
  private chain: AuditBlock[] = [];
  private backupChainForTamperReset: AuditBlock[] = [];

  constructor() {
    this.initializeGenesisBlock();
    this.seedInitialAuditHistory();
  }

  private initializeGenesisBlock() {
    const entryId = "audit-block-genesis-0000";
    const timestamp = "2026-01-01T00:00:00.000Z";
    const details = { system: "Samanvay AICTE Grievance Portal", protocol: "Cryptographic Hash-Chained Audit Trail v1.0" };
    const detailsHash = computeDetailsHash(details);
    const actor: AuditActor = {
      id: "aicte-system",
      name: "AICTE Central Authority System",
      role: "Admin",
      bureau: "Central",
    };

    const blockHash = computeBlockHash(
      GENESIS_PREV_HASH,
      0,
      entryId,
      "SYSTEM",
      "GENESIS_INITIALIZATION",
      detailsHash,
      timestamp,
      actor
    );

    const genesisBlock: AuditBlock = {
      block_index: 0,
      entry_id: entryId,
      complaint_id: "SYSTEM",
      action: "GENESIS_INITIALIZATION",
      actor,
      timestamp,
      details,
      details_hash: detailsHash,
      previous_hash: GENESIS_PREV_HASH,
      block_hash: blockHash,
      signature: signBlockHash(blockHash),
    };

    this.chain = [genesisBlock];
  }

  private seedInitialAuditHistory() {
    this.appendBlock(
      "COMP-2026-0001",
      "GRIEVANCE_REGISTERED",
      { id: "usr-cit-1", name: "Ananya Sharma", role: "Complainant" },
      { category: "Fee Regulation", institution_id: "inst-1", mode: "Online Portal" }
    );

    this.appendBlock(
      "COMP-2026-0001",
      "AUTO_ROUTED_TO_BUREAU",
      { id: "aicte-classifier", name: "AICTE AI Intake Router", role: "Admin", bureau: "Approval" },
      { bureau: "Approval", confidence: 0.94, rule: "Fee structure violation" }
    );

    this.appendBlock(
      "COMP-2026-0001",
      "OFFICER_ASSIGNED",
      { id: "aicte-admin", name: "Director General Portal", role: "Admin" },
      { officer_id: "off-rb-1", officer_name: "Dr. Rajesh Verma", method: "Round-Robin" }
    );

    // Save pristine copy for tamper reset simulation
    this.backupChainForTamperReset = JSON.parse(JSON.stringify(this.chain));
  }

  /**
   * Append a new cryptographically verified block to the chain
   */
  appendBlock(
    complaintId: string,
    action: string,
    actor: AuditActor,
    details: Record<string, any>
  ): AuditBlock {
    const previousBlock = this.chain[this.chain.length - 1];
    const blockIndex = this.chain.length;
    const entryId = `audit-block-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const timestamp = new Date().toISOString();
    const detailsHash = computeDetailsHash(details);

    const previousHash = previousBlock ? previousBlock.block_hash : GENESIS_PREV_HASH;
    const blockHash = computeBlockHash(
      previousHash,
      blockIndex,
      entryId,
      complaintId,
      action,
      detailsHash,
      timestamp,
      actor
    );

    const signature = signBlockHash(blockHash);

    const newBlock: AuditBlock = {
      block_index: blockIndex,
      entry_id: entryId,
      complaint_id: complaintId,
      action,
      actor,
      timestamp,
      details,
      details_hash: detailsHash,
      previous_hash: previousHash,
      block_hash: blockHash,
      signature,
    };

    this.chain.push(newBlock);
    // Keep clean backup updated
    this.backupChainForTamperReset = JSON.parse(JSON.stringify(this.chain));
    return newBlock;
  }

  /**
   * Retrieve all blocks or blocks matching a specific complaint ID
   */
  getBlocks(complaintId?: string): AuditBlock[] {
    if (!complaintId || complaintId === "ALL" || complaintId === "all") {
      return [...this.chain];
    }
    return this.chain.filter(
      (b) => b.complaint_id === complaintId || b.complaint_id === "SYSTEM"
    );
  }

  /**
   * Cryptographically audit and verify the entire chain or a provided array of blocks
   */
  verifyChain(blocksToVerify: AuditBlock[] = this.chain): ChainVerificationResult {
    const now = new Date().toISOString();

    if (!blocksToVerify || blocksToVerify.length === 0) {
      return {
        isValid: false,
        totalBlocks: 0,
        verifiedAt: now,
        errorReason: "Audit chain is empty. Missing genesis block.",
      };
    }

    // 1. Verify Genesis Block
    const genesis = blocksToVerify[0];
    if (genesis.block_index !== 0 || genesis.previous_hash !== GENESIS_PREV_HASH) {
      return {
        isValid: false,
        totalBlocks: blocksToVerify.length,
        verifiedAt: now,
        brokenIndex: 0,
        tamperedBlock: genesis,
        errorReason: `Genesis block invalid. Expected previous_hash=${GENESIS_PREV_HASH}, found=${genesis.previous_hash}`,
      };
    }

    // 2. Iterate each block and verify hash links and payload integrity
    for (let i = 0; i < blocksToVerify.length; i++) {
      const block = blocksToVerify[i];

      // Verify Details Hash
      const expectedDetailsHash = computeDetailsHash(block.details);
      if (block.details_hash !== expectedDetailsHash) {
        return {
          isValid: false,
          totalBlocks: blocksToVerify.length,
          verifiedAt: now,
          brokenIndex: i,
          tamperedBlock: block,
          errorReason: `Block #${i} details tampered! Expected details_hash=${expectedDetailsHash}, found=${block.details_hash}`,
        };
      }

      // Verify previous_hash link for blocks after genesis
      if (i > 0) {
        const prevBlock = blocksToVerify[i - 1];
        if (block.previous_hash !== prevBlock.block_hash) {
          return {
            isValid: false,
            totalBlocks: blocksToVerify.length,
            verifiedAt: now,
            brokenIndex: i,
            tamperedBlock: block,
            errorReason: `Chain link broken at Block #${i}! previous_hash does not match Block #${i - 1} block_hash.`,
          };
        }
      }

      // Recompute and verify block_hash
      const expectedBlockHash = computeBlockHash(
        block.previous_hash,
        block.block_index,
        block.entry_id,
        block.complaint_id,
        block.action,
        block.details_hash,
        block.timestamp,
        block.actor
      );

      if (block.block_hash !== expectedBlockHash) {
        return {
          isValid: false,
          totalBlocks: blocksToVerify.length,
          verifiedAt: now,
          brokenIndex: i,
          tamperedBlock: block,
          errorReason: `Block #${i} hash mismatch! Computed=${expectedBlockHash}, Stored=${block.block_hash}`,
        };
      }

      // Verify HMAC signature
      const isSigValid = verifyBlockSignature(block.block_hash, block.signature);
      if (!isSigValid) {
        return {
          isValid: false,
          totalBlocks: blocksToVerify.length,
          verifiedAt: now,
          brokenIndex: i,
          tamperedBlock: block,
          errorReason: `Block #${i} HMAC cryptographic signature verification failed! Possible non-repudiation forgery.`,
        };
      }
    }

    const headBlock = blocksToVerify[blocksToVerify.length - 1];
    return {
      isValid: true,
      totalBlocks: blocksToVerify.length,
      verifiedAt: now,
      chainHeadHash: headBlock.block_hash,
    };
  }

  /**
   * For testing & live demo: Inject simulated malicious tampering into a block
   */
  simulateTamper(blockIndex: number, alteredField: string = "action", alteredValue: any = "UNAUTHORIZED_STAGE_BYPASS"): {
    success: boolean;
    tamperedBlockIndex: number;
    message: string;
  } {
    if (blockIndex < 0 || blockIndex >= this.chain.length) {
      return { success: false, tamperedBlockIndex: -1, message: "Invalid block index for tamper simulation." };
    }

    const target = this.chain[blockIndex];
    if (alteredField === "details") {
      target.details = { ...target.details, ...alteredValue, _tampered: true };
    } else {
      (target as any)[alteredField] = alteredValue;
    }

    return {
      success: true,
      tamperedBlockIndex: blockIndex,
      message: `Simulated unauthorized tamper injected into Block #${blockIndex} (${alteredField} altered). Verify tool will catch this immediately!`,
    };
  }

  /**
   * Restore clean chain after tamper simulation test
   */
  restorePristineChain(): void {
    this.chain = JSON.parse(JSON.stringify(this.backupChainForTamperReset));
  }
}

export const auditChain = new AuditChainLedger();
