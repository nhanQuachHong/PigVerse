import {
  captureGenesisRecoverySnapshot,
  createRecoveryRpc,
} from "../src/server/recovery-snapshot.ts";

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!rpcUrl || !contract) {
  process.stderr.write(
    "Recovery inspection requires BASE_SEPOLIA_RPC_URL and NEXT_PUBLIC_CONTRACT_ADDRESS.\n",
  );
  process.exitCode = 1;
} else {
  try {
    const snapshot = await captureGenesisRecoverySnapshot(
      { contract },
      createRecoveryRpc(rpcUrl),
    );
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  } catch {
    process.stderr.write(
      "Recovery inspection failed; no snapshot was produced.\n",
    );
    process.exitCode = 1;
  }
}
