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
  ],
};
