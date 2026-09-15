import { type NextRequest, NextResponse } from "next/server";

import { createContentSecurityPolicy } from "./src/lib/security-headers";

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const policy = createContentSecurityPolicy(nonce, process.env.NODE_ENV);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", policy);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
