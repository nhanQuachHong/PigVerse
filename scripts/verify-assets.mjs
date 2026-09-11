import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const expectedArtwork = {
  "01-captain-oink.png":
    "8e35742c23821080874f492bc140a8c451601fe5e3d1349b4671675dec32b2e2",
  "02-mochi.png":
    "c1342be681c7d134b692cb8649cb6e310d6d700a8dd029b9feaa6b6bb384038a",
  "03-professor-truffle.png":
    "ff7a5791bb7885fd3b1bf465b573174499f13796e28922be31486f8e61bf1cdf",
  "04-chef-pippa.png":
    "50b5205ce99d578a81b876669b645bcdd75d879e419ec3bffc5ecb2ce855bc70",
  "05-sir-snout.png":
    "274fe615b905ca6b3f5b84503a0b327f9856ea94e49ef95ab1870074667048dc",
  "06-nova.png":
    "93f36fcb4048a5991fdeeddb88420cf3c7432110f499de6632ac5d2a9ac4ad1b",
  "07-fizz.png":
    "ea09b952d89ada53cad4cf328159e2220f5de9b43ed145a14ad4f9faf36bd576",
  "08-lumi.png":
    "56a29153657c145d313f0e2ef152c370f5942ea3508bcd46284797ef1c8f00d0",
  "09-ziggy.png":
    "0c832e5f2507ff874d2d53147293a47a19cd7c503fd820b91bbf5941b2d11254",
  "10-king-truffle.png":
    "4c0c8c481c5c4cbb46f410e7b0f6b085463113f6e8f21ae3803becf43d235e63",
};

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

for (const [filename, expectedSha256] of Object.entries(expectedArtwork)) {
  const bytes = await readFile(new URL(filename, artworkDirectory));
  const signature = bytes.subarray(0, 8).toString("hex");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  assert.equal(signature, "89504e470d0a1a0a", `${filename} is not a PNG`);
  assert.equal(width, 1254, `${filename} width changed`);
  assert.equal(height, 1254, `${filename} height changed`);
  assert.equal(sha256, expectedSha256, `${filename} content changed`);
}

console.log(
  "Verified hashes and dimensions for 10 canonical Genesis PNG artworks.",
);
