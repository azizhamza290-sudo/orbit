import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Edge-safe auth configuration used by middleware.
 * IMPORTANT: do not import Prisma/bcrypt here — the Credentials
 * provider (which needs the database) is added in lib/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/verify-email");

      const isPublicPage = pathname === "/" || pathname.startsWith("/invite/");
      const isApiAuth =
        pathname.startsWith("/api/auth") ||
        pathname === "/api/register" ||
        pathname === "/api/verify-email" ||
        pathname.startsWith("/api/password") ||
        pathname.startsWith("/api/invites");

      if (isApiAuth) return true;
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/workspaces", request.nextUrl));
      }
      if (!isLoggedIn && !isAuthPage && !isPublicPage) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
