import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(
    new URL("../config/genesis-artwork.json", import.meta.url),
    "utf8",
  ),
);
assert.deepEqual(
  manifest.map(({ tokenId }) => tokenId),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "Canonical Genesis token IDs changed",
);
const expectedArtwork = Object.fromEntries(
  manifest.map((asset) => [asset.filename, asset]),
);

const artworkDirectory = new URL(
  "../apps/web/public/assets/nft/",
  import.meta.url,
);
const actualArtwork = (await readdir(artworkDirectory)).sort();

assert.deepEqual(
  actualArtwork,
  Object.keys(expectedArtwork),
  "Canonical Genesis artwork set changed",
);

for (const [filename, expected] of Object.entries(expectedArtwork)) {
  const bytes = await readFile(new URL(filename, artworkDirectory));
  const signature = bytes.subarray(0, 8).toString("hex");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  assert.equal(signature, "89504e470d0a1a0a", `${filename} is not a PNG`);
  assert.equal(width, expected.width, `${filename} width changed`);
  assert.equal(height, expected.height, `${filename} height changed`);
  assert.equal(sha256, expected.sha256, `${filename} content changed`);
}

console.log(
  "Verified hashes and dimensions for 10 canonical Genesis PNG artworks.",
);
