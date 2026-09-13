import {
  getPublicCollection,
  type PublicCollection,
  type PublicDeployment,
} from "./public-collection";

export type PublicToken = PublicCollection["tokens"][number];

export type PublicNftDetail = {
  block: string | null;
  contentStatus: "pending-approval";
  degraded: boolean;
  deployment: PublicDeployment | null;
  relatedTokens: PublicToken[];
  token: PublicToken;
};

export function parseGenesisTokenId(value: string): number | null {
  if (!/^(?:[1-9]|10)$/.test(value)) return null;
  return Number(value);
}

export async function getPublicNftDetail(
  tokenId: number,
  environment: Parameters<typeof getPublicCollection>[0] = process.env,
): Promise<PublicNftDetail | null> {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 10) return null;
  const collection = await getPublicCollection(environment);
  const token = collection.tokens.find(
    (candidate) => candidate.tokenId === tokenId,
  );
  if (!token) return null;
  const relatedTokens = collection.tokens
    .filter((candidate) => candidate.tokenId !== tokenId)
    .slice(0, 3);
  return {
    block: collection.block,
    contentStatus: "pending-approval",
    degraded: collection.degraded,
    deployment: collection.deployment,
    relatedTokens,
    token,
  };
}
