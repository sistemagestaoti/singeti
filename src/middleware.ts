import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lista de chaves suportadas para descriptografia de sessão resiliente no Edge Runtime da Vercel
const SECRETS_TO_TRY = [
  process.env.NEXTAUTH_SECRET,
  process.env.AUTH_SECRET,
  "super-secret-key-123",
  "syngeti-log-master-secret-auth-key-prod-2026",
].filter(Boolean) as string[];

export async function middleware(req: NextRequest) {
  let token = null;

  for (const secret of SECRETS_TO_TRY) {
    try {
      token =
        (await getToken({ req, secret, cookieName: "__Secure-next-auth.session-token" })) ||
        (await getToken({ req, secret, cookieName: "next-auth.session-token" })) ||
        (await getToken({ req, secret }));
      if (token) break;
    } catch {
      // Tenta a próxima chave em caso de divergência de criptografia
    }
  }

  if (!token) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cmdb/:path*",
    "/service-desk/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/projects/:path*",
    "/contracts/:path*",
    "/bookings/:path*",
    "/changes/:path*",
    "/problems/:path*",
    "/knowledge/:path*",
    "/connect/:path*",
    "/suppliers/:path*",
  ],
};
