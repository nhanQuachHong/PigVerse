import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const expectedArtwork = [
  "01-captain-oink.png",
  "02-mochi.png",
  "03-professor-truffle.png",
  "04-chef-pippa.png",
  "05-sir-snout.png",
  "06-nova.png",
  "07-fizz.png",
  "08-lumi.png",
  "09-ziggy.png",
  "10-king-truffle.png",
];

const artworkDirectory = new URL("../public/assets/nft/", import.meta.url);
const actualArtwork = (await readdir(artworkDirectory)).sort();

assert.deepEqual(
  actualArtwork,
  expectedArtwork,
  "Canonical Genesis artwork set changed",
);

for (const filename of expectedArtwork) {
  const bytes = await readFile(new URL(filename, artworkDirectory));
  const signature = bytes.subarray(0, 8).toString("hex");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);

  assert.equal(signature, "89504e470d0a1a0a", `${filename} is not a PNG`);
  assert.equal(width, 1254, `${filename} width changed`);
  assert.equal(height, 1254, `${filename} height changed`);
}

console.log("Verified 10 canonical 1254x1254 Genesis PNG artworks.");
