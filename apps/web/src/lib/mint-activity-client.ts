import type { Hash } from "viem";

export async function reportMintTransaction(transactionHash: Hash) {
  if (!/^0x[0-9a-f]{64}$/iu.test(transactionHash))
    throw new Error("Invalid transaction hash");
  const response = await fetch("/api/mint-activity", {
    body: JSON.stringify({ transactionHash }),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error("Mint activity unavailable");
}
