import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MODEL = "deepseek-chat";
const MAX_TOKENS_CAP = 1024;
const MAX_MESSAGES = 40;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages es obligatorio" }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Conversación demasiado larga" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY no está configurada en el entorno (apps/web/.env.local)" },
      { status: 500 }
    );
  }

  // No confiamos en model/max_tokens tal cual llegan del cliente: los acotamos
  // para evitar abuso de coste sobre la clave de DeepSeek.
  const safeBody = {
    ...body,
    model: ALLOWED_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
    stream: false,
  };

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(safeBody),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
