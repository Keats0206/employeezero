import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ONBOARDING_COOKIE = "ez_onboarding_done";
const PROTOTYPE_ASSUME_ONBOARDED = true;

export default function middleware(req: NextRequest) {
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
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
