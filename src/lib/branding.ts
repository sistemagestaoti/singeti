import fs from 'fs';
import path from 'path';

export interface BrandingData {
  loginLogo: string | null;
  appLogo: string | null;
  appIcon: string | null;
  favicon: string | null;
  loginBackground: string | null;
  updatedAt: number;
}

const DEFAULT_BRANDING: BrandingData = {
  loginLogo: '/api/branding/logo',
  appLogo: '/api/branding/logo',
  appIcon: '/branding/logo-icon.png',
  favicon: '/branding/logo-icon.png',
  loginBackground: null,
  updatedAt: Date.now(),
};

declare global {
  // eslint-disable-next-line no-var
  var __brandingCache: BrandingData | undefined;
}

const TMP_FILE = '/tmp/branding.json';
const LOCAL_DATA_FILE = path.join(process.cwd(), 'data', 'branding.json');

export function getBranding(): BrandingData {
  if (globalThis.__brandingCache) {
    return globalThis.__brandingCache;
  }

  // 1. Verificar se existe versao em /tmp (gravavel em serverless)
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ TMP_FILE)) {
      const data = fs.readFileSync(/*turbopackIgnore: true*/ TMP_FILE, 'utf8');
      const parsed = JSON.parse(data);
      globalThis.__brandingCache = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('[Branding] Falha ao ler /tmp/branding.json:', err);
  }

  // 2. Tentar ler do repositorio / diretorio da aplicacao
  const candidatePaths = [
    LOCAL_DATA_FILE,
    path.join(__dirname, '..', '..', 'data', 'branding.json'),
    '/var/task/data/branding.json',
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        const data = fs.readFileSync(/*turbopackIgnore: true*/ candidate, 'utf8');
        const parsed = JSON.parse(data);
        globalThis.__brandingCache = parsed;
        return parsed;
      }
    } catch {}
  }

  globalThis.__brandingCache = { ...DEFAULT_BRANDING };
  return globalThis.__brandingCache;
}

export function saveBranding(data: Partial<BrandingData>): BrandingData {
  const current = getBranding();
  const updated: BrandingData = {
    ...current,
    ...data,
    updatedAt: Date.now(),
  };

  // Mantem no cache global em memoria
  globalThis.__brandingCache = updated;

  // 1. Grava no diretorio /tmp (sempre permitido em serverless/Vercel)
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Branding] Falha ao gravar /tmp/branding.json:', err);
  }

  // 2. Grava no diretorio local se permitido (ambiente de desenvolvimento)
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Silencia EROFS na Vercel (read-only filesystem)
  }

  return updated;
}

