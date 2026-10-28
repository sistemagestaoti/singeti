import { prisma } from "@/lib/prisma";
import { normalizeString, areStringsEquivalent } from "@/lib/normalize";

let cachedCombinedRequesters: any[] | null = null;
let requestersCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateRequestersCache() {
  cachedCombinedRequesters = null;
  requestersCacheTime = 0;
}

export async function getUnifiedRequesters(search?: string) {
  const now = Date.now();
  let combined = cachedCombinedRequesters;

  if (!combined || now - requestersCacheTime >= CACHE_TTL_MS) {
    const [requesters, users] = await Promise.all([
      prisma.requester.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          job_title: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" }
      })
    ]);

    const list: Array<{
      id: string;
      name: string;
      email?: string | null;
      job_title?: string | null;
      department_name?: string | null;
      is_system_user: boolean;
      source: "USER" | "REQUESTER";
    }> = [];

    users.forEach(u => {
      list.push({
        id: u.id,
        name: u.name,
        email: u.email,
        job_title: u.job_title,
        department_name: u.department?.name || null,
        is_system_user: true,
        source: "USER",
      });
    });

    requesters.forEach(r => {
      const alreadyHas = list.some(c => areStringsEquivalent(c.name, r.name));
      if (!alreadyHas) {
        list.push({
          id: r.id,
          name: r.name,
          email: r.email,
          job_title: r.job_title,
          department_name: r.department_name,
          is_system_user: false,
          source: "REQUESTER",
        });
      }
    });

    cachedCombinedRequesters = list;
    requestersCacheTime = now;
    combined = list;
  }

  if (search) {
    const norm = normalizeString(search);
    return combined.filter(c => 
      normalizeString(c.name).includes(norm) ||
      (c.email && normalizeString(c.email).includes(norm))
    );
  }

  return combined;
}
