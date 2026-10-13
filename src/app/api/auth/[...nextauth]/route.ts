import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

if (!process.env.NEXTAUTH_URL) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) {
    process.env.NEXTAUTH_URL = `https://${host}`;
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
