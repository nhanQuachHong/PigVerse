# Genesis Sepolia deployment preparation

Status: Ignition module verified on local OP-compatible network; external
Sepolia deployment and explorer verification are not yet completed.

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

`ignition/deploy-sepolia.ts` explicitly connects to `baseSepolia` and checks the
provider chain ID and `GENESIS_OWNER_ADDRESS` before invoking Ignition. Its
preflight rejects Mainnet, local chains and invalid/zero owners. Release-profile
selection and external signer setup remain pending. Do not bypass this entry
point by deploying the module directly to another network.

After execution, retain the Ignition journal, contract address,
transaction hash, chain ID, compiler/build profile and constructor arguments;
verify the explorer source and repeat initial-state reads against that address.
Do not mark M2 externally verified from the local test alone.
