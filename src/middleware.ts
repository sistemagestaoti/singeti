import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIMARY_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "super-secret-key-123";

export async function middleware(req: NextRequest) {
  let token = null;

  // Verificação direta e de alta velocidade baseada no cookie presente na requisição
  const isSecure = req.cookies.has("__Secure-next-auth.session-token");
  const cookieName = isSecure ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  try {
    token = await getToken({
      req,
      secret: PRIMARY_SECRET,
      cookieName,
      secureCookie: isSecure,
    });
  } catch {
    // Fallback genérico caso haja divergência
    try {
      token = await getToken({ req, secret: PRIMARY_SECRET });
    } catch {}
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
