/** Canonical identities from docs/ASSET_MANIFEST.md. These references describe
 * artwork only; they do not imply publication, mintability or chain ownership. */
export const CHARACTER_CATALOG = [
  {
    tokenId: 1,
    name: "Captain Oink",
    artwork: "/assets/nft/01-captain-oink.png",
  },
  { tokenId: 2, name: "Mochi", artwork: "/assets/nft/02-mochi.png" },
  {
    tokenId: 3,
    name: "Professor Truffle",
    artwork: "/assets/nft/03-professor-truffle.png",
  },
  { tokenId: 4, name: "Chef Pippa", artwork: "/assets/nft/04-chef-pippa.png" },
  { tokenId: 5, name: "Sir Snout", artwork: "/assets/nft/05-sir-snout.png" },
  { tokenId: 6, name: "Nova", artwork: "/assets/nft/06-nova.png" },
  { tokenId: 7, name: "Fizz", artwork: "/assets/nft/07-fizz.png" },
  { tokenId: 8, name: "Lumi", artwork: "/assets/nft/08-lumi.png" },
  { tokenId: 9, name: "Ziggy", artwork: "/assets/nft/09-ziggy.png" },
  {
    tokenId: 10,
    name: "King Truffle",
    artwork: "/assets/nft/10-king-truffle.png",
  },
] as const;

export function getGenesisCharacter(tokenId: number) {
  return CHARACTER_CATALOG.find((character) => character.tokenId === tokenId);
}
