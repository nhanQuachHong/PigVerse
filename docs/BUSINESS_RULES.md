# Pigverse Business Rules

## BR-001 — Genesis Supply Is Permanently 10
- Rule: Pigverse Genesis contains exactly 10 token IDs, 1 through 10. Approved product behavior must not increase Genesis maximum supply.
- Reason: The product identity is a 10-character 1/1 Genesis collection.
- Affected features: Contract, collection UI, mint progress, recovery.
- Exceptions: None in approved scope.
- Example: Season 2 must use a separate collection/deployment rather than adding token 11 to Genesis.

## BR-002 — Each Genesis Token Is 1/1
- Rule: Each token ID may be successfully minted at most once.
- Reason: Each artwork is a unique character collectible.
- Affected features: Minting, concurrency, ownership.
- Exceptions: None.
- Example: If token 3 is owned, a second mint for token 3 must fail.

## BR-003 — User Chooses Exact NFT
- Rule: Minting targets a specific fixed token ID chosen by the user; no random assignment or reveal mechanism is part of approved scope.
- Reason: Users can view all artwork before mint and choose a preferred character.
- Affected features: Collection, NFT detail, mint contract/API.
- Exceptions: None.
- Example: Clicking Mint on Captain Oink always targets Captain Oink's fixed token ID.

## BR-004 — Mint Price Is Contract-Authoritative and Configurable
- Rule: The active mint price is stored/enforced by the smart contract and may be changed only by the Contract Owner. Base Sepolia starts at price 0. Base Mainnet price is TBD.
- Reason: Avoid frontend hard-coded monetary rules and support later Mainnet configuration.
- Affected features: Mint UI, contract administration.
- Exceptions: None.
- Example: If owner changes price after a user loads the page, the transaction must still satisfy the current contract rule.

## BR-005 — Pause Blocks New Mints, Not Browsing
- Rule: When contract minting is paused, users may still view Pigverse and minted ownership, but new mint actions must be disabled/fail.
- Reason: Emergency control should not erase or hide the collection.
- Affected features: Contract, collection, NFT detail.
- Exceptions: Already-submitted transaction outcome follows on-chain execution semantics.
- Example: Page shows Minting paused instead of hiding available characters.

## BR-006 — Wallet Is Collector Identity
- Rule: Collectors do not create a username/password account in approved scope; connected wallet address identifies the current collector context.
- Reason: Simplify NFT-native experience.
- Affected features: Wallet connection, My NFTs, mint UX.
- Exceptions: Admin authentication uses wallet signing and an application session.
- Example: My NFTs derives from the connected address.

## BR-007 — Important Public Content Is VI + EN
- Rule: Important public UI, NFT descriptions, stories/lore, and key mint/status messaging support Vietnamese and English.
- Reason: Product requirement for bilingual experience.
- Affected features: Home, Collection, Detail, Story, mint UX, Admin content workflow.
- Exceptions: Provider error text may have technical diagnostics restricted to logs; user-facing messages should remain localized where practical.
- Example: Captain Oink has VI and EN story content.

## BR-008 — No NFT Reservation
- Rule: Viewing or initiating a mint does not reserve an NFT. Competing users may attempt to mint the same token; chain execution decides the winner.
- Reason: Approved product choice avoids off-chain hold logic.
- Affected features: Mint flow, concurrency.
- Exceptions: None.
- Example: Two wallets submit for token 5; only one can successfully own token 5.

## BR-009 — Blockchain Is Source of Truth for Ownership
- Rule: Application DB/cache must not override on-chain ownership or successful mint state.
- Reason: NFT ownership is blockchain state.
- Affected features: Collection status, My NFTs, Admin mint activity, recovery.
- Exceptions: Temporary UI states such as MINT_PENDING are not ownership.
- Example: A DB row saying wallet A owns token 2 must be corrected if chain says wallet B owns it.

## BR-010 — Administrative Rights Are Explicit
- Rule: Application Admin and Contract Owner are distinct logical roles. Admin endpoints require authenticated authorized Admin status; contract owner functions require on-chain owner authorization.
- Reason: Prevent frontend-only or role-confused authorization.
- Affected features: Admin auth, contract controls.
- Exceptions: Same human/wallet may hold both roles initially.
- Example: Being in the application Admin list does not automatically bypass contract owner checks.

## BR-011 — Minted Content Is Immutable
- Rule: Once a Genesis NFT is minted, its approved artwork and NFT metadata/content representation must not be changed through the product.
- Reason: Preserve collectible integrity and buyer expectations.
- Affected features: Admin editing, IPFS metadata, recovery.
- Exceptions: None currently approved.
- Example: Admin cannot replace Captain Oink artwork after mint.

## BR-012 — Only Complete Assets May Be Published
- Rule: NFT cannot enter published/available state until required artwork, IPFS metadata and backup requirements are successfully completed.
- Reason: Prevent minting broken or incomplete NFTs.
- Affected features: Asset processing, Admin publish.
- Exceptions: None.
- Example: Artwork IPFS success + metadata failure => ERROR, not AVAILABLE.

## BR-013 — Admin Changes Are Audited
- Rule: Important Admin content changes and administrative actions must create durable audit records.
- Reason: Multiple Admin wallets are supported and changes must be traceable.
- Affected features: Admin Dashboard, content management, authorization changes.
- Exceptions: Exact list of auditable low-risk read actions is an engineering/security policy decision.
- Example: Changing an unminted NFT story records actor wallet and timestamp.

## BR-014 — Core State Must Be Recoverable
- Rule: Core Genesis representation must be recoverable from blockchain + IPFS + backup storage without treating application DB as final authority for ownership.
- Reason: Reduce dependence on a single mutable backend database.
- Affected features: Backups, operations, recovery.
- Exceptions: Non-authoritative operational data such as some UI logs may not be fully reconstructable unless separately backed up.
- Example: Database loss must not cause previously minted NFTs to become available again.

## BR-015 — Minted NFTs Remain Visible
- Rule: Minted NFTs stay in the Genesis collection and continue to show owner/status. At 10/10 minted, the site remains a gallery/story/ownership experience.
- Reason: Collection history is part of product value.
- Affected features: Collection, Home progress, post-sellout behavior.
- Exceptions: None.
- Example: Sold-out token remains visible instead of disappearing.

## BR-016 — NFT Ownership Does Not Transfer Copyright/Commercial Rights
- Rule: Holder receives NFT ownership and approved personal/social usage rights, but not copyright ownership or commercial exploitation rights.
- Reason: Product owner decision on license model.
- Affected features: License content, NFT detail, terms.
- Exceptions: Any future commercial license requires a separately approved product/legal change.
- Example: Holder may use artwork as avatar but may not sell merchandise using the artwork under current terms.

## BR-017 — Genesis NFTs Cannot Be Burned Through Approved Product
- Rule: Approved Genesis contract behavior does not expose a supported burn capability.
- Reason: Preserve all 10 character identities.
- Affected features: Contract, ownership UI.
- Exceptions: None in approved scope.
- Example: User cannot destroy token 7 using a Pigverse burn function.

## BR-018 — Genesis Has No Admin Reserve
- Rule: All 10 Genesis NFTs are intended for public mint; Admin has no product feature to reserve/mint a subset in advance.
- Reason: Approved public distribution rule.
- Affected features: Contract and Admin.
- Exceptions: None.
- Example: Admin Dashboard cannot mark token 1 as reserved.

## BR-019 — Multiple Application Admins Are Supported
- Rule: The application authorization model can contain multiple Admin wallet addresses.
- Reason: Product owner selected multi-admin application operations.
- Affected features: Admin auth and authorization.
- Exceptions: Initial deployment may start with one authorized Admin.
- Example: Two distinct approved wallets may independently authenticate as Application Admins.

## BR-020 — Season 2 Must Not Mutate Genesis Identity
- Rule: Future seasons/collections are separate from Genesis and must not change Genesis token IDs, max supply, or minted history.
- Reason: Preserve Genesis permanence.
- Affected features: Future architecture, navigation, deployment.
- Exceptions: None.
- Example: Season 2 may have its own collection contract/configuration but not add token IDs 11–20 to Genesis.
