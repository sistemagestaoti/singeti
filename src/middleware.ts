import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "syngeti-log-master-secret-auth-key-prod-2026";

export async function middleware(req: NextRequest) {
  // Procura token tanto com prefixo seguro (__Secure-) quanto padrão para compatibilidade total em produção e preview
  const token =
    (await getToken({ req, secret: AUTH_SECRET, cookieName: "__Secure-next-auth.session-token" })) ||
    (await getToken({ req, secret: AUTH_SECRET, cookieName: "next-auth.session-token" })) ||
    (await getToken({ req, secret: AUTH_SECRET }));

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
