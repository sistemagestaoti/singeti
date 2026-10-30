import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { source, eventType, endpoint, statusCode, durationMs, message, details } = body;

    // Registra telemetria de forma não-bloqueante
    await prisma.sentinelaTelemetry.create({
      data: {
        source: source || "frontend",
        event_type: eventType || "error",
        endpoint: endpoint || null,
        status_code: statusCode ? Number(statusCode) : null,
        duration_ms: durationMs ? Number(durationMs) : null,
        message: message ? String(message).slice(0, 500) : "Evento de telemetria",
        details: details ? (typeof details === "string" ? details : JSON.stringify(details)) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Falhas de telemetria não devem quebrar o cliente
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
