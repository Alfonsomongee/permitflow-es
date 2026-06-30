/**
 * apps/web/app/api/alertas/leer/route.ts
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await req.json();

  await supabaseAdmin
    .from("alertas_boe")
    .update({ leida: true })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
