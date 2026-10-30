import { NextRequest, NextResponse } from "next/server";
import { knowledgeBaseService } from "@/lib/knowledge-base";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const articleId = searchParams.get("id");

    if (articleId) {
      const article = knowledgeBaseService.getArticleById(articleId);
      if (!article) {
        return NextResponse.json({ error: "Article not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, article });
    }

    const articles = knowledgeBaseService.searchArticles(query, category);
    return NextResponse.json({ success: true, count: articles.length, articles });
  } catch (err: any) {
    console.error("Knowledge Base Query Error:", err);
    return NextResponse.json({ error: "Failed to query knowledge base." }, { status: 500 });
  }
}
