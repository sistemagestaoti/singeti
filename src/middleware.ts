import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
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
