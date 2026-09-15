const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https: wss:",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' blob: data:",
  "object-src 'none'",
  "worker-src 'self' blob:",
];

export function createContentSecurityPolicy(
  nonce: string,
  environment: "development" | "production" | "test" = "production",
) {
  if (!/^[a-zA-Z0-9+/=_-]+$/u.test(nonce)) throw new Error("Invalid CSP nonce");

  const developmentScriptPolicy =
    environment === "development" ? " 'unsafe-eval'" : "";

  return [
    ...contentSecurityPolicyDirectives,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptPolicy}`,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

export const securityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;
