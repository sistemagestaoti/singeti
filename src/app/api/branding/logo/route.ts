import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const candidates = [
      path.join(process.cwd(), 'public', 'branding', 'logo-hq-transparent.png'),
      path.join(process.cwd(), 'public', 'branding', 'logo-combined.png'),
      path.join(__dirname, '..', '..', '..', '..', 'public', 'branding', 'logo-hq-transparent.png'),
      '/var/task/public/branding/logo-hq-transparent.png',
    ];

    for (const c of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ c)) {
        const imageBuffer = fs.readFileSync(/*turbopackIgnore: true*/ c);
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    return new NextResponse('Not found', { status: 404 });
  } catch (e) {
    return new NextResponse('Internal error', { status: 500 });
  }
}
