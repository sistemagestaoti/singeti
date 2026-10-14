import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

export interface BrandingData {
  loginLogo: string | null;
  appLogo: string | null;
  appIcon: string | null;
  favicon: string | null;
  loginBackground: string | null;
  updatedAt: number;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'branding.json');

const DEFAULT_BRANDING: BrandingData = {
  loginLogo: null,
  appLogo: null,
  appIcon: null,
  favicon: null,
  loginBackground: null,
  updatedAt: Date.now(),
};

let cachedBranding: BrandingData | null = null;
let lastBrandingFetch = 0;
const BRANDING_CACHE_TTL = 60000; // 60 segundos de cache em memória

export async function getBrandingAsync(): Promise<BrandingData> {
  const now = Date.now();
  if (cachedBranding && (now - lastBrandingFetch < BRANDING_CACHE_TTL)) {
    return cachedBranding;
  }

  // 1. Tenta buscar no banco de dados persistente (Supabase PostgreSQL)
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'branding' }
    });
    if (setting?.value) {
      cachedBranding = JSON.parse(setting.value);
      lastBrandingFetch = now;
      return cachedBranding!;
    }
  } catch (err) {
    console.warn('Aviso ao consultar branding no banco:', err);
  }

  // 2. Fallback para arquivo local
  cachedBranding = getBranding();
  lastBrandingFetch = now;
  return cachedBranding;
}

export function getBranding(): BrandingData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading branding.json', err);
  }

  return DEFAULT_BRANDING;
}

export async function saveBrandingAsync(data: Partial<BrandingData>): Promise<BrandingData> {
  const current = await getBrandingAsync();
  const updated = { ...current, ...data, updatedAt: Date.now() };
  cachedBranding = updated;
  lastBrandingFetch = Date.now();

  // 1. Grava no banco de dados persistente (Supabase PostgreSQL)
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'branding' },
      update: { value: JSON.stringify(updated) },
      create: { key: 'branding', value: JSON.stringify(updated) }
    });
  } catch (err) {
    console.error('Erro ao salvar branding no Supabase:', err);
  }

  // 2. Grava no arquivo local (quando permissões permitirem)
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (fsErr) {
    // Em Serverless o disco pode ser read-only
  }

  return updated;
}

export function saveBranding(data: Partial<BrandingData>) {
  const current = getBranding();
  const updated = { ...current, ...data, updatedAt: Date.now() };
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}
  return updated;
}
