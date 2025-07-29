// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import acceptLanguage from "accept-language";

const SUPPORTED = ["en", "de"] as const;
acceptLanguage.languages(SUPPORTED as unknown as string[]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* Statische Assets & API ignorieren */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\\.(png|jpg|svg|webp|json)$/)
  ) {
    return NextResponse.next();
  }

  /* ① Sprache aus Pfad lesen */
  const pathLng = pathname.split("/")[1];
  const pathLngValid = SUPPORTED.includes(pathLng as any);

  /* ② Fallbacks */
  const cookieLng = req.cookies.get("NEXT_LOCALE")?.value;
  const headerLng = acceptLanguage.get(req.headers.get("Accept-Language"));
  const lng = (pathLngValid ? pathLng : cookieLng || headerLng || "en") as
    (typeof SUPPORTED)[number];

  /* ③ Wenn Pfad noch KEIN Sprach-Segment trägt → redirect */
  if (!pathLngValid) {
    return NextResponse.redirect(new URL(`/${lng}${pathname}`, req.url));
  }

  /* ④ Cookie aktualisieren & Header setzen */
  const res = NextResponse.next();
  res.cookies.set("NEXT_LOCALE", lng, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  res.headers.set("x-locale", lng);
  return res;
}

export const config = {
  matcher: "/((?!.*\\.[^/]+$).*)",
};
