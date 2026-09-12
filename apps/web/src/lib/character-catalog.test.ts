import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { CHARACTER_CATALOG, getGenesisCharacter } from "./character-catalog";
import { GENESIS_TOKEN_IDS } from "./genesis";

it("binds all ten token identities to existing approved artwork", () => {
  const manifest = readFileSync(
    resolve(process.cwd(), "../../docs/ASSET_MANIFEST.md"),
    "utf8",
  );
  expect(CHARACTER_CATALOG.map((character) => character.tokenId)).toEqual(
    GENESIS_TOKEN_IDS,
  );
  for (const character of CHARACTER_CATALOG) {
    expect(
      existsSync(resolve(process.cwd(), `public${character.artwork}`)),
    ).toBe(true);
    const row = manifest
      .split("\n")
      .find((line) => line.includes(`apps/web/public${character.artwork}`));
    expect(row).toContain(character.name);
  }
});

it("does not alias invalid IDs to a real character", () => {
  for (const id of [0, 11, 1.5, NaN])
    expect(getGenesisCharacter(id)).toBeUndefined();
});
