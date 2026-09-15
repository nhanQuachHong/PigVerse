import { describe, expect, it } from "vitest";

import {
  createContentSecurityPolicy,
  securityHeaders,
} from "./security-headers";

describe("web security headers", () => {
  it("applies the static modern browser security headers", () => {
    const headers = Object.fromEntries(
      securityHeaders.map(({ key, value }) => [key, value]),
    );

    expect(headers).toMatchObject({
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
  });

  it("creates a nonce-bound production CSP without inline or eval script grants", () => {
    const policy = createContentSecurityPolicy("abcDEF0123_-");

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(
      "script-src 'self' 'nonce-abcDEF0123_-' 'strict-dynamic'",
    );
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/u);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/script-src[^;]*(?:https:|\*)/u);
  });

  it("allows eval only for the Next.js development runtime", () => {
    expect(createContentSecurityPolicy("abc123", "development")).toContain(
      "'unsafe-eval'",
    );
  });

  it("rejects a nonce that could inject a CSP directive", () => {
    expect(() => createContentSecurityPolicy("abc'; script-src *")).toThrow(
      "Invalid CSP nonce",
    );
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
