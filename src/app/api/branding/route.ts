import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { getBranding, saveBranding } from '@/lib/branding';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const data = getBranding();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Apenas admins podem alterar a identidade visual
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const type = formData.get('type') as string;

    if (!['loginLogo', 'appLogo', 'appIcon', 'favicon', 'loginBackground'].includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    if (action === 'restore') {
      const current = getBranding();
      const oldPath = current[type as keyof typeof current] as string | null;
      
      // Remover arquivo antigo se existir e não for default (embora defaults não estejam na pasta uploads)
      if (oldPath && oldPath.startsWith('/branding/')) {
        const fullPath = path.join(process.cwd(), 'public', oldPath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }

      saveBranding({ [type]: null });
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
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filepath = path.join(uploadDir, filename);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Basic SVG sanitization (if SVG)
      if (file.type === 'image/svg+xml') {
        const svgContent = buffer.toString('utf8');
        if (svgContent.includes('<script') || svgContent.includes('javascript:')) {
          return NextResponse.json({ error: 'Malicious SVG content detected' }, { status: 400 });
        }
      }

      fs.writeFileSync(filepath, buffer);

      const publicUrl = `/branding/${filename}`;

      // Remover arquivo antigo
      const current = getBranding();
      const oldPath = current[type as keyof typeof current] as string | null;
      if (oldPath && oldPath.startsWith('/branding/')) {
        const fullOldPath = path.join(process.cwd(), 'public', oldPath);
        if (fs.existsSync(fullOldPath)) fs.unlinkSync(fullOldPath);
      }

      saveBranding({ [type]: publicUrl });
      
      return NextResponse.json({ success: true, url: publicUrl });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling branding upload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
