import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Arquivo temporário seguro e compatível com Windows e Linux
const TMP_PRESENCE = path.join(os.tmpdir(), 'symgest_presence.json');
// 35 segundos: garante detecção rápida de offline sem falsos negativos durante navegação normal
const TIMEOUT_MS = 35 * 1000;

function getMap(): Map<string, UserPresence> {
  if (!globalThis.__presenceMap) {
    globalThis.__presenceMap = new Map();
    try {
      if (fs.existsSync(TMP_PRESENCE)) {
        const raw = fs.readFileSync(TMP_PRESENCE, 'utf8');
        const entries: [string, UserPresence][] = JSON.parse(raw);
        for (const [k, v] of entries) {
          globalThis.__presenceMap.set(k, v);
        }
      }
    } catch {}
  }
  return globalThis.__presenceMap;
}

function persistMap(map: Map<string, UserPresence>) {
  try {
    const entries = Array.from(map.entries());
    fs.writeFileSync(TMP_PRESENCE, JSON.stringify(entries), 'utf8');
  } catch {}
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

  // Também registra por email para vincular caso o login use IDs de contingência (ex: admin-master)
  if (email) {
    map.set(`email:${email.toLowerCase()}`, record);
  }

  // Limpeza preventiva de entradas muito antigas (> 24h) para preservar memória
  if (map.size > 200) {
    for (const [k, v] of map.entries()) {
      if (now - v.lastSeen > 24 * 60 * 60 * 1000) {
        map.delete(k);
      }
    }
  }

  persistMap(map);
}

export function setUserOffline(userId: string, email?: string | null) {
  const map = getMap();
  const expiredTime = Date.now() - (TIMEOUT_MS + 5000);
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
  persistMap(map);
}

export function isUserOnline(userId: string, email?: string | null): boolean {
  const map = getMap();
  const now = Date.now();

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

export function getUserLastSeen(userId: string, email?: string | null): number | null {
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
