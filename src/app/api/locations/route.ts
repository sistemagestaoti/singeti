import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

let cachedLocations: any[] | null = null;
let locationsCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateLocationsCache() {
  cachedLocations = null;
  locationsCacheTime = 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = Date.now();
    if (cachedLocations && now - locationsCacheTime < CACHE_TTL_MS) {
      return NextResponse.json(cachedLocations, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });

    cachedLocations = locations;
    locationsCacheTime = now;

    return NextResponse.json(locations, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("GET /api/locations error:", error);
    return NextResponse.json({ error: "Erro ao listar unidades" }, { status: 500 });
  }
}
