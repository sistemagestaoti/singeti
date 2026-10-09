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

const DATA_FILE = path.join(process.cwd(), 'data', 'branding.json');

export function getBranding(): BrandingData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading branding.json', err);
  }
  
  return {
    loginLogo: null,
    appLogo: null,
    appIcon: null,
    favicon: null,
    loginBackground: null,
    updatedAt: Date.now(),
  };
}

export function saveBranding(data: Partial<BrandingData>) {
  const current = getBranding();
  const updated = { ...current, ...data, updatedAt: Date.now() };
  fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
