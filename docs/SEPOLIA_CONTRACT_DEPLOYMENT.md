# Genesis Sepolia deployment preparation

Status: Ignition module verified on local OP-compatible network; external
Sepolia deployment and explorer verification are not yet completed.

## Read-only network simulation evidence

The production Cancun artifact constructor executed successfully through
`eth_call` at Base Sepolia block `46815991` (chain ID `84532`), returning 7,790
bytes of runtime code. Init-code hash:
`0xa4fadea3bb06c57361d8c79028b92bba95565f54d0deb4f91dfea1df6c6aa7ab`.
Runtime hash:
`0xe2601bbfaa74415596f918f5bd17a529712b213a5aaaacef6e44880e52fe7d71`.

Repeat with `pnpm --filter @pigverse/contracts simulate:sepolia`. This compiles
production then performs a read-only constructor call via the public endpoint
listed in [Base network documentation](https://docs.base.org/get-started/connect-to-base).
It neither signs nor broadcasts transactions. Constructor simulation does not
prove deployed storage, explorer verification or full live mint behavior.

Module: `packages/contracts/ignition/modules/GenesisSepolia.ts`.
It requires an explicit `GenesisSepolia.owner` address parameter and fixes the
initial mint price to zero. The owner can differ from the deploying account.
No token is published, minted or reserved during deployment.

Approved public owner address:
`0xbf61Aa23FC0d92f2B0a50A0b1367754f135b39B4`, recorded in
`ignition/parameters/base-sepolia.json`. The guarded entry point uses this value
unless the deployment operator explicitly sets `GENESIS_OWNER_ADDRESS`.
This public parameter contains no signing credentials. An external deployment
has not been signed or submitted by adding it.

The current local test deploys the real module and verifies owner, zero price,
zero minted supply, max supply ten, unpaused state, and ten empty publication
references. Unpaused does not enable mint without publication.

Before external execution, require Base Sepolia chain ID 84532, an approved
owner address, a funded deployment signer and RPC configuration. Keep signer
material in the deployment operator's secret store; never put it in parameters,
documentation or Git. Do not use this test-price module for Mainnet.

Store the RPC URL and deployment signer interactively in Hardhat's encrypted
keystore; these commands prompt for values and do not take them as command-line
arguments:

```text
pnpm --dir packages/contracts exec hardhat keystore set BASE_SEPOLIA_RPC_URL
pnpm --dir packages/contracts exec hardhat keystore set BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY
```

The deployment signer may differ from the configured Owner. Fund only the signer
with enough Base Sepolia ETH for deployment gas, rerun the read-only simulation,
then execute the guarded entry point:

```text
pnpm --filter @pigverse/contracts simulate:sepolia
pnpm --filter @pigverse/contracts deploy:sepolia
```

Do not type a signing key into chat, source files, shell history or command-line
arguments. `pnpm verify:secrets` must pass before and after deployment.

`ignition/deploy-sepolia.ts` explicitly connects to `baseSepolia`, checks the
provider chain ID, validates `GENESIS_OWNER_ADDRESS` and refuses an unfunded
signer before invoking Ignition. After deployment it independently reads and
requires the approved Owner, price zero, maximum supply ten, total supply zero
and unpaused state before printing a redaction-safe JSON record. Its preflight
rejects Mainnet, local chains and invalid/zero owners. The production profile
(Solidity 0.8.34, Cancun EVM target, optimizer 200 runs) passes all 25 local
contract tests with `pnpm --filter @pigverse/contracts test:production`. Use
`build:production` to compile the same profile. External signer setup and
verification of the target network's supported EVM revision remain pending. Do
not bypass this entry point by deploying the module directly to another network.

Both compiler profiles explicitly target Cancun rather than inheriting the
compiler's Osaka default. This fixes generated-opcode expectations across
profiles; it does not substitute for RPC simulation of the deployment artifact.
See [Solidity compiler target documentation](https://docs.soliditylang.org/en/latest/using-the-compiler.html)
for the meaning of `evmVersion` and compatibility warnings.

After execution, retain the Ignition journal, contract address,
transaction hash, chain ID, compiler/build profile and constructor arguments;
verify the explorer source and repeat initial-state reads against that address.
Do not mark M2 externally verified from the local test alone.
