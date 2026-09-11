import { describe, expect, it } from "vitest";

import {
  GENESIS_MAX_SUPPLY,
  GENESIS_MAX_TOKEN_ID,
  GENESIS_MIN_TOKEN_ID,
  GENESIS_TOKEN_IDS,
} from "./genesis";

describe("Pigverse Genesis foundation", () => {
  it("represents exactly the approved token IDs 1 through 10", () => {
    expect(GENESIS_MIN_TOKEN_ID).toBe(1);
    expect(GENESIS_MAX_TOKEN_ID).toBe(10);
    expect(GENESIS_MAX_SUPPLY).toBe(10);
    expect(GENESIS_TOKEN_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
