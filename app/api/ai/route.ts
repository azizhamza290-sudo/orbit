import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { chatWithAI } from "@/services/ai/openrouter";

export async function POST(request: Request) {
  try {
    await requireUser();

    const body = await request.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const reply = await chatWithAI(message);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "AI request failed",
      },
      {
        status: 500,
      }
    );
  }
}
