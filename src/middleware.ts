import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/mypage(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const origin = req.headers.get("origin") || "";
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (req.method === "OPTIONS" && isApi) {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", origin || "*");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.headers.set("Access-Control-Max-Age", "86400");
    return res;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const res = NextResponse.next();
  if (isApi && origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
