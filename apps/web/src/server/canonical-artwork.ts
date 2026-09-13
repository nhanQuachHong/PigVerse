import { createHash } from "node:crypto";

import artworkManifest from "../../../../config/genesis-artwork.json";

type ArtworkManifestEntry = {
  filename: string;
  height: number;
  sha256: string;
  tokenId: number;
  width: number;
};

const manifest = artworkManifest as ArtworkManifestEntry[];

export function getCanonicalArtwork(tokenId: number) {
  const entry = manifest.find((candidate) => candidate.tokenId === tokenId);
  return entry ? { ...entry } : null;
}

export function verifyCanonicalArtwork(tokenId: number, bytes: Uint8Array) {
  const entry = getCanonicalArtwork(tokenId);
  if (!entry) return false;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return sha256 === entry.sha256;
}
