import { withAuth } from "next-auth/middleware";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "syngeti-log-master-secret-auth-key-prod-2026";

export default withAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: AUTH_SECRET,
});

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
