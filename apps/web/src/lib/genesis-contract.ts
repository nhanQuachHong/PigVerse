import { parseAbi } from "viem";

export const genesisAbi = parseAbi([
  "function mint(uint256 tokenId, uint256 expectedRevision) payable",
  "function mintPrice() view returns (uint256)",
  "function paused() view returns (bool)",
  "function publish(uint256 tokenId, uint256 expectedRevision, string uri)",
  "function publicationRevision(uint256 tokenId) view returns (uint256)",
  "function publishedURI(uint256 tokenId) view returns (string)",
  "function unpublish(uint256 tokenId, uint256 expectedRevision)",
]);
