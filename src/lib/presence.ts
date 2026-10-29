import { prisma } from '@/lib/prisma';

export interface UserPresence {
  userId: string;
  name?: string;
  email?: string;
  lastSeen: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __presenceMap: Map<string, UserPresence> | undefined;
}

// 45 segundos: garante detecção estável sem falsos negativos durante navegação normal
const TIMEOUT_MS = 45 * 1000;

function getMap(): Map<string, UserPresence> {
  if (!globalThis.__presenceMap) {
    globalThis.__presenceMap = new Map();
  }
  return globalThis.__presenceMap;
}

export function recordUserPresence(userId: string, name?: string, email?: string) {
  if (!userId) return;
  const map = getMap();
  const now = Date.now();

  const record: UserPresence = {
    userId,
    name: name || undefined,
    email: email || undefined,
    lastSeen: now,
  };

  map.set(userId, record);
  if (email) {
    map.set(`email:${email.toLowerCase()}`, record);
  }

  // Persistência assíncrona no PostgreSQL (compartilhada entre todas as lambdas da Vercel)
  prisma.user.updateMany({
    where: {
      OR: [
        { id: userId },
        ...(email ? [{ email: email.toLowerCase() }] : [])
      ]
    },
    data: { last_seen_at: new Date(now) }
  }).catch(() => {});
}

export function setUserOffline(userId: string, email?: string | null) {
  const map = getMap();
  const expiredTime = Date.now() - (TIMEOUT_MS + 10000);
  const byId = map.get(userId);
  if (byId) {
    byId.lastSeen = expiredTime;
    map.set(userId, byId);
  }
  if (email) {
    const byEmail = map.get(`email:${email.toLowerCase()}`);
    if (byEmail) {
      byEmail.lastSeen = expiredTime;
      map.set(`email:${email.toLowerCase()}`, byEmail);
    }
  }

  prisma.user.updateMany({
    where: {
      OR: [
        { id: userId },
        ...(email ? [{ email: email.toLowerCase() }] : [])
      ]
    },
    data: { last_seen_at: new Date(expiredTime) }
  }).catch(() => {});
}

export function isUserOnline(userId: string, email?: string | null, dbLastSeen?: Date | null): boolean {
  const now = Date.now();

  // 1. Verifica timestamp do banco de dados (mais confiável em ambientes serverless)
  if (dbLastSeen) {
    const dbTime = new Date(dbLastSeen).getTime();
    if (now - dbTime < TIMEOUT_MS) return true;
  }

  // 2. Verifica cache em memória
  const map = getMap();
  const byId = map.get(userId);
  if (byId && (now - byId.lastSeen < TIMEOUT_MS)) {
    return true;
  }

  if (email) {
    const byEmail = map.get(`email:${email.toLowerCase()}`);
    if (byEmail && (now - byEmail.lastSeen < TIMEOUT_MS)) {
      return true;
    }
  }

  return false;
}

export function getUserLastSeen(userId: string, email?: string | null, dbLastSeen?: Date | null): number | null {
  if (dbLastSeen) {
    return new Date(dbLastSeen).getTime();
  }
  const map = getMap();
  const byId = map.get(userId);
  if (byId) return byId.lastSeen;

  if (email) {
    const byEmail = map.get(`email:${email.toLowerCase()}`);
    if (byEmail) return byEmail.lastSeen;
  }

  return null;
}

export function getAllPresenceMap(): Record<string, { isOnline: boolean; lastSeen: number }> {
  const map = getMap();
  const now = Date.now();
  const result: Record<string, { isOnline: boolean; lastSeen: number }> = {};

  for (const [key, value] of map.entries()) {
    result[key] = {
      isOnline: now - value.lastSeen < TIMEOUT_MS,
      lastSeen: value.lastSeen,
    };
  }

  return result;
}
