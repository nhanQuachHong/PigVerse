import { expect, it, vi } from "vitest";
import { readGenesisOwnership } from "./ownership-reader";

const contract = `0x${"1".repeat(40)}`;
it("pins code and token reads to one block and isolates failed token reads", async () => {
  const rpc = vi.fn(async (method: string, params: unknown[]) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_blockNumber") return "0x123";
    expect(params[1]).toBe("0x123");
    if (method === "eth_getCode") return "0x6000";
    const data = (params[0] as { data: string }).data;
    const id = Number(BigInt(`0x${data.slice(10)}`));
    if (id === 1) return `0x${"0".repeat(24)}${"a".repeat(40)}`;
    if (id === 2) throw new Error("timeout");
    throw { code: 3, data: `0x7e273289${id.toString(16).padStart(64, "0")}` };
  });
  const result = await readGenesisOwnership(rpc, contract, 84532);
  expect(result.block).toBe("0x123");
  expect(result.ownership.size).toBe(10);
  expect(result.ownership.get(1)).toEqual({
    state: "minted",
    owner: `0x${"a".repeat(40)}`,
  });
  expect(result.ownership.get(2)).toEqual({ state: "unknown" });
  expect(result.ownership.get(3)).toEqual({ state: "unminted" });
});

it("rejects wrong networks before any ownership calls", async () => {
  const rpc = vi.fn(async () => "0x2105");
  const result = await readGenesisOwnership(rpc, contract, 84532);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(result.block).toBeNull();
  expect(
    [...result.ownership.values()].every((read) => read.state === "unknown"),
  ).toBe(true);
});

it("does not interpret an undeployed address as ten unminted tokens", async () => {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce("0x14a34")
    .mockResolvedValueOnce("0x123")
    .mockResolvedValueOnce("0x");
  expect((await readGenesisOwnership(rpc, contract, 84532)).block).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(3);
});
