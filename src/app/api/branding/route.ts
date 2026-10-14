import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { getBrandingAsync, saveBrandingAsync } from '@/lib/branding';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const data = await getBrandingAsync();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Apenas perfis administrativos podem alterar a identidade visual
  const role = (session?.user?.role || "").toUpperCase();
  if (!session || (role !== 'ADMIN' && role !== 'ADMINISTRADOR' && role !== 'GESTOR')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const type = formData.get('type') as string;

    if (!['loginLogo', 'appLogo', 'appIcon', 'favicon', 'loginBackground'].includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    if (action === 'restore') {
      const current = await getBrandingAsync();
      const oldPath = current[type as keyof typeof current] as string | null;
      
      // Remover arquivo antigo se existir
      if (oldPath && oldPath.startsWith('/branding/')) {
        try {
          const fullPath = path.join(process.cwd(), 'public', oldPath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch {}
      }

      await saveBrandingAsync({ [type]: null });
      return NextResponse.json({ success: true, url: null });
    }

    if (action === 'upload') {
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
      if (!validMimeTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
      }

      // Max size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }

      const ext = path.extname(file.name) || (file.type === 'image/svg+xml' ? '.svg' : '.png');
      const filename = `${type}_${uuidv4()}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'branding');
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Basic SVG sanitization (if SVG)
      if (file.type === 'image/svg+xml') {
        const svgContent = buffer.toString('utf8');
        if (svgContent.includes('<script') || svgContent.includes('javascript:')) {
          return NextResponse.json({ error: 'Malicious SVG content detected' }, { status: 400 });
        }
      }

      // Tenta gravar arquivo local se o sistema de arquivos permitir (ambiente dev)
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
      } catch (e) {
        // Ignora erro de gravação em disco em ambientes serverless read-only
      }

      // Converte para Data URI persistente no banco do Supabase
      const base64 = buffer.toString('base64');
      const persistentUrl = `data:${file.type};base64,${base64}`;

      await saveBrandingAsync({ [type]: persistentUrl });
      
      return NextResponse.json({ success: true, url: persistentUrl });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling branding upload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
