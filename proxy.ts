import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const ONBOARDING_COOKIE = "ez_onboarding_done";
const PROTOTYPE_ASSUME_ONBOARDED = true;

// Routes that require a signed-in session. Everything else (the sign-in page,
// landing redirect at /, NextAuth routes, static assets) stays public.
const PROTECTED = ["/chat", "/dashboard", "/preview", "/onboarding", "/upgrade", "/settings"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const onboardingDone =
      PROTOTYPE_ASSUME_ONBOARDED ||
      req.cookies.get(ONBOARDING_COOKIE)?.value === "1";

    if (pathname === "/onboarding") {
      return NextResponse.next();
    }

    if (!onboardingDone) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/sign-in" },
    callbacks: {
      // Only enforce auth on protected routes; let everything else through so
      // withAuth doesn't gate public pages.
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        const needsAuth = PROTECTED.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`)
        );
        return needsAuth ? !!token : true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
