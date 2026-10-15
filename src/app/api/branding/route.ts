import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBranding, saveBranding } from '@/lib/branding';

export async function GET() {
  const data = getBranding();
  return NextResponse.json(data, {
    headers: {
      // Cache por 60s, aceita stale por até 5min enquanto revalida em background
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Apenas perfis administrativos ou gestores podem alterar a identidade visual
  const role = (session?.user?.role || "").toUpperCase();
  if (!session || (!role.includes('ADMIN') && !role.includes('GESTOR') && role !== 'TI')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const type = formData.get('type') as string;

    if (!['loginLogo', 'appLogo', 'appIcon', 'favicon', 'loginBackground'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de ativo visual inválido' }, { status: 400 });
    }

    if (action === 'restore') {
      saveBranding({ [type]: null });
      return NextResponse.json({ success: true, url: null });
    }

    if (action === 'upload') {
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }

      const validMimeTypes = [
        'image/jpeg', 
        'image/png', 
        'image/webp', 
        'image/svg+xml', 
        'image/x-icon', 
        'image/vnd.microsoft.icon'
      ];
      if (!validMimeTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Formato de arquivo inválido. Formatos aceitos: PNG, JPG, WEBP, SVG, ICO.' }, { status: 400 });
      }

      // Max size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'O arquivo não deve ultrapassar 5MB.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Basic SVG sanitization (if SVG)
      if (file.type === 'image/svg+xml') {
        const svgContent = buffer.toString('utf8');
        if (svgContent.includes('<script') || svgContent.includes('javascript:')) {
          return NextResponse.json({ error: 'Conteúdo SVG malicioso detectado' }, { status: 400 });
        }
      }

      // Converte para Base64 Data URL diretamente
      // Isso elimina 100% de dependência do sistema de arquivos read-only da Vercel
      const mimeType = file.type || 'image/png';
      const base64Url = `data:${mimeType};base64,${buffer.toString('base64')}`;

      saveBranding({ [type]: base64Url });
      
      return NextResponse.json({ success: true, url: base64Url });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling branding upload:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

