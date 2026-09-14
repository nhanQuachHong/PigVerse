import { describe, expect, it } from "vitest";

import { securityHeaders } from "./security-headers";

describe("web security headers", () => {
  it("applies a deny-by-default browser policy without enabling remote scripts", () => {
    const headers = Object.fromEntries(
      securityHeaders.map(({ key, value }) => [key, value]),
    );

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["Content-Security-Policy"]).not.toMatch(
      /script-src[^;]*(?:https:|\*)/u,
    );
    expect(headers).toMatchObject({
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
  });

  it("does not grant sensitive browser capabilities", () => {
    const permissions = securityHeaders.find(
      ({ key }) => key === "Permissions-Policy",
    )?.value;

    expect(permissions).toBe(
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    );
  });
});
