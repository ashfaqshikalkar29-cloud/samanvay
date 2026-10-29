import { NextRequest, NextResponse } from "next/server";
import { defaultChatbotEngine, ChatSessionState } from "@/lib/ai/chatbot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, state } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message text is required for citizen assistant." },
        { status: 400 }
      );
    }

    const sessionState: ChatSessionState = state || { step: "idle", draft: {} };
    const { message: botReply, nextState } = await defaultChatbotEngine.processMessage(
      message,
      sessionState
    );

    return NextResponse.json({
      success: true,
      reply: botReply,
      state: nextState,
    });
  } catch (err: any) {
    console.error("Chatbot assistant error:", err);
    return NextResponse.json(
      { error: "Failed to process chat message." },
      { status: 500 }
    );
  }
}
