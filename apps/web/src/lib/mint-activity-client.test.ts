import { afterEach, describe, expect, it, vi } from "vitest";

import { reportMintTransaction } from "./mint-activity-client";

const transactionHash = `0x${"a".repeat(64)}` as const;

afterEach(() => vi.unstubAllGlobals());

describe("mint activity client", () => {
  it("reports only the transaction hash to the evidence endpoint", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);

    await expect(
      reportMintTransaction(transactionHash),
    ).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith("/api/mint-activity", {
      body: JSON.stringify({ transactionHash }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("rejects malformed hashes before making a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    await expect(reportMintTransaction("0x1234")).rejects.toThrow(
      "Invalid transaction hash",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces ingestion outages to the caller without changing mint truth", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(reportMintTransaction(transactionHash)).rejects.toThrow(
      "Mint activity unavailable",
    );
  });
});
