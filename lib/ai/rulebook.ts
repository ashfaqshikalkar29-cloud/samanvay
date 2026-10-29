import { RulebookClauseCitation, RulebookQAResponse } from "./types";
import { AICTE_REGULATION_CHUNKS } from "./rag-resolution";
import { defaultEmbeddingService, cosineSimilarity } from "@/lib/embeddings";

export class RulebookQAService {
  async ask(query: string): Promise<RulebookQAResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        query,
        answer: "Please enter a question regarding AICTE regulations or Approval Process Handbook norms.",
        citations: [],
        is_grounded: false,
        disclaimer: "AICTE Regulatory AI Assistant for Authorized Officers.",
      };
    }

    const qEmb = await defaultEmbeddingService.embed(trimmed);
    const queryTokens = new Set(
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );

    // Score all available handbook clauses using hybrid dense + sparse retrieval
    const scored: Array<{ clause: RulebookClauseCitation; score: number }> = [];
    for (const clause of AICTE_REGULATION_CHUNKS) {
      const clauseFullText = `${clause.chapter} ${clause.clause_title} ${clause.clause_text} ${clause.clause_number}`.toLowerCase();
      const cEmb = await defaultEmbeddingService.embed(clauseFullText);
      const vecSim = cosineSimilarity(qEmb, cEmb);

      // Keyword term matching boost
      let keywordHits = 0;
      for (const tok of queryTokens) {
        if (clauseFullText.includes(tok)) keywordHits++;
      }
      const kwBoost = queryTokens.size > 0 ? (keywordHits / queryTokens.size) * 0.45 : 0;
      const combinedScore = Math.min(1.0, vecSim * 0.6 + kwBoost);

      scored.push({
        clause: { ...clause, relevance_score: Math.round(combinedScore * 100) / 100 },
        score: combinedScore,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Grounding Threshold: if combined similarity is below 0.28, return "not found in documents"
    if (!best || best.score < 0.28) {
      return {
        query,
        answer: "This query is not found in official AICTE documents, handbooks, or statutory regulations currently in the knowledge base.",
        citations: [],
        is_grounded: false,
        disclaimer: "Strict adherence to official AICTE Approval Process Handbook (APH 2024-27).",
      };
    }

    // Build grounded answer citing document and page
    const c = best.clause;
    const answer = `According to **${c.source_document}**, **${c.chapter}** (${c.clause_number} — *${c.clause_title}*, Page ${c.page_number}):\n\n> "${c.clause_text}"\n\n**Officer Action Guidance:** Technical institutions failing to abide by this requirement are subject to penal proceedings under Chapter VIII of the AICTE Act.`;

    const relevantCitations = scored
      .filter((s) => s.score >= 0.40)
      .slice(0, 3)
      .map((s) => s.clause);

    return {
      query,
      answer,
      citations: relevantCitations,
      is_grounded: true,
      disclaimer: "Grounded strictly in AICTE Approval Process Handbook 2024-27 statutory records.",
    };
  }
}

export const defaultRulebookQA = new RulebookQAService();
