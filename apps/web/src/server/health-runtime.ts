import { resolvePublicChainConfig } from "../lib/public-collection";
import { readCurrentOwner } from "./current-owner";
import { getDatabase } from "./database";
import type { HealthDependencies } from "./health";

export function getHealthRuntime(): HealthDependencies {
  const configuration = resolvePublicChainConfig();
  return {
    checkChain: async () =>
      configuration ? Boolean(await readCurrentOwner(configuration)) : false,
    checkDatabase: async () => {
      const rows = await getDatabase()<Array<{ ready: number }>>`
        SELECT 1 AS ready
      `;
      return rows.length === 1 && Number(rows[0]?.ready) === 1;
    },
    configurationReady: Boolean(configuration),
  };
}
