import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: google("gemini-3.8-flash"),
      system: SYSTEM_PROMPT,
      prompt: message,
    });

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get a reply from Gemini" },
      { status: 500 }
    );
  }
}
