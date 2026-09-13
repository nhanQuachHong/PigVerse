import { getAdminAuthStore } from "./admin-auth-store";
import { authenticateAdminSession } from "./admin-auth";
import { readCurrentOwner } from "./current-owner";
import { resolvePublicChainConfig } from "../lib/public-collection";

export function getAdminAuthRuntime() {
  const deployment = resolvePublicChainConfig();
  const appOrigin = process.env.PIGVERSE_APP_ORIGIN;
  if (!deployment || !appOrigin)
    throw new Error("Admin authentication is unavailable");
  const parsedOrigin = new URL(appOrigin);
  const local =
    parsedOrigin.hostname === "localhost" ||
    parsedOrigin.hostname === "127.0.0.1";
  if (
    parsedOrigin.origin !== appOrigin ||
    (parsedOrigin.protocol !== "https:" && !local)
  )
    throw new Error("Admin authentication is unavailable");
  return {
    appOrigin,
    chainId: deployment.chainId,
    readOwner: () => readCurrentOwner(deployment),
    store: getAdminAuthStore(),
  };
}

export const adminSessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-pigverse-admin"
    : "pigverse-admin";

export function adminSessionCookie(token: string, expiresAt: Date) {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  return `${adminSessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function expiredAdminSessionCookie() {
  return `${adminSessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function hasExpectedOrigin(request: Request, expectedOrigin: string) {
  return request.headers.get("origin") === expectedOrigin;
}

export function adminAuthJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

export async function authenticateAdminRequest(
  request: Request,
  runtime = getAdminAuthRuntime(),
) {
  const token = readCookie(request, adminSessionCookieName);
  return token ? authenticateAdminSession(token, runtime) : null;
}
