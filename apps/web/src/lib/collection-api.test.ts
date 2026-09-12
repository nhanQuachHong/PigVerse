import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../../app/api/collection/route";

afterEach(() => vi.unstubAllEnvs());

it("serves ten canonical identities without fabricated chain state when unconfigured", async () => {
  vi.stubEnv("PIGVERSE_ENV", "local");
  const response = await GET();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const result = await response.json();
  expect(result.tokens).toHaveLength(10);
  expect(result.mintedCount).toBeNull();
  expect(result.degraded).toBe(true);
  expect(
    result.tokens.every(
      (token: { status: string; owner: unknown }) =>
        token.status === "unknown" && token.owner === null,
    ),
  ).toBe(true);
  expect(result.tokens[0].name).toBe("Captain Oink");
});
