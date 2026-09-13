import { queryOptions } from "@tanstack/react-query";

export type AdminSession =
  | { authenticated: false }
  | {
      authenticated: true;
      expiresAt: string;
      walletAddress: `0x${string}`;
    };

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

export async function fetchAdminSession(): Promise<AdminSession> {
  const response = await fetch("/api/admin/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (response.status === 401) return { authenticated: false };
  if (!response.ok) throw new Error("ADMIN_AUTH_UNAVAILABLE");
  const body = (await response.json()) as Record<string, unknown>;
  if (
    body.authenticated !== true ||
    typeof body.expiresAt !== "string" ||
    Number.isNaN(Date.parse(body.expiresAt)) ||
    typeof body.walletAddress !== "string" ||
    !addressPattern.test(body.walletAddress)
  )
    throw new Error("ADMIN_AUTH_INVALID_RESPONSE");
  return {
    authenticated: true,
    expiresAt: body.expiresAt,
    walletAddress: body.walletAddress as `0x${string}`,
  };
}

export const adminSessionQuery = queryOptions({
  queryFn: fetchAdminSession,
  queryKey: ["admin-session"] as const,
  refetchOnWindowFocus: true,
  retry: false,
  staleTime: 15_000,
});
