# Pigverse Acceptance Tests

## AT-PUBLIC-001 — Home shows Genesis progress
**Given** authoritative chain state shows 3 Genesis tokens minted  
**When** a visitor opens Home  
**Then** Pigverse introduction and featured characters are visible  
**And** progress is shown as `3 / 10 Minted`  
**And** Explore Collection is available.

## AT-PUBLIC-002 — Collection always represents all 10 Genesis tokens
**Given** 4 tokens are minted and 6 are unminted  
**When** the visitor selects All  
**Then** all token IDs 1..10 are represented  
**When** the visitor selects Minted  
**Then** only currently minted tokens are shown according to chain-derived state.

## AT-PUBLIC-003 — NFT detail is verifiable
**Given** token 6 is minted  
**When** its detail page opens  
**Then** artwork, localized content, token ID, network, contract and current owner are shown  
**And** owner is based on chain state.

## AT-WALLET-001 — Wallet rejection is safe
**Given** a visitor has no connected wallet  
**When** they reject a connection request  
**Then** no collector/admin authenticated state is created  
**And** public browsing continues.

## AT-MINT-001 — Selected token mints exactly once
**Given** token 4 is published, unminted, contract active and wallet has sufficient funds  
**When** the wallet confirms a valid mint for token 4  
**Then** token 4 becomes owned by that address on-chain  
**And** the site eventually shows token 4 as minted  
**And** a second mint cannot create another token 4.

## AT-MINT-002 — Same-token race has at most one winner
**Given** token 7 is unminted  
**When** two wallets submit competing valid mint transactions for token 7  
**Then** at most one transaction successfully creates ownership of token 7  
**And** the losing flow shows failure/reconciles to the actual owner.

## AT-MINT-003 — Paused contract blocks mint but not browsing
**Given** Contract Owner has paused minting  
**When** a visitor opens Collection/NFT Detail  
**Then** artwork/story remain visible  
**And** Mint is disabled with a paused message  
**And** a new mint call cannot succeed.

## AT-MINT-004 — Refresh during pending does not create false success
**Given** a user submitted a mint and the tx hash is known  
**When** they refresh before final outcome  
**Then** the product restores pending/unknown state and re-resolves the transaction  
**And** only shows success after authoritative success.

## AT-MINT-005 — Price change uses contract truth
**Given** the UI previously displayed price P1  
**And** Contract Owner changes the price to P2  
**When** a new mint attempt begins  
**Then** the current contract price P2 is used/shown for the attempt  
**And** stale price P1 is not treated as authoritative.

## AT-MYNFT-001 — Empty My NFTs
**Given** the connected wallet owns no Genesis token  
**When** My NFTs opens  
**Then** an empty state and Explore Pigverse CTA appear.

## AT-MYNFT-002 — External transfer updates ownership
**Given** token 2 was transferred outside Pigverse from wallet A to wallet B  
**When** ownership is refreshed  
**Then** wallet A no longer sees token 2 in My NFTs  
**And** wallet B does  
**And** public owner is wallet B.

## AT-ADMIN-001 — Authorized wallet signature creates Admin session
**Given** an authorized Admin wallet receives a current unused challenge  
**When** it signs the expected message and verification succeeds  
**Then** an Admin session is established.

## AT-ADMIN-002 — Non-admin signature cannot become Admin
**Given** a wallet is not currently authorized  
**When** it signs a cryptographically valid challenge  
**Then** Admin access is denied.

## AT-ADMIN-003 — Replay is denied
**Given** a challenge has already been successfully consumed  
**When** the same signed challenge is submitted again  
**Then** verification is denied  
**And** no new valid Admin session is created from that replay.

## AT-ADMIN-004 — Draft edit creates audit entry
**Given** an Admin session and unminted token 5  
**When** the Admin changes valid localized content  
**Then** the new draft revision is saved  
**And** an audit event identifies actor, action, target and time.

## AT-ADMIN-005 — Minted token cannot be edited
**Given** token 5 is minted on-chain  
**When** an Admin attempts to edit protected artwork/metadata/content  
**Then** the operation is rejected even if application DB still says unminted.

## AT-ASSET-001 — Partial asset failure blocks publication
**Given** artwork upload succeeds  
**But** metadata IPFS upload or required backup fails  
**When** processing ends  
**Then** the token is not READY/PUBLISHED  
**And** an ERROR/retry state is available.

## AT-ASSET-002 — Retry is safe
**Given** a previous processing attempt partially succeeded  
**When** Admin retries  
**Then** successful prior outputs are not corrupted  
**And** the final active package corresponds to one exact content revision.

## AT-PUBLISH-001 — Ready token can publish
**Given** an unminted token has complete required assets and is READY  
**When** Admin publishes it  
**Then** it becomes publicly available/mintable subject to current contract state.

## AT-PUBLISH-002 — Minted token cannot be hidden by unpublish
**Given** a token is minted  
**When** Admin attempts to unpublish it  
**Then** the operation cannot remove that Genesis token from public collection representation.

## AT-AUDIT-001 — Audit history remains historical
**Given** Admin A made a recorded change and is later revoked  
**When** an authorized Admin views audit history  
**Then** the historical event still identifies Admin A.

## AT-ACTIVITY-001 — Mint activity distinguishes outcomes
**Given** one successful, one reverted and one still-pending mint observation exist  
**When** Admin opens Mint Activity  
**Then** each outcome is displayed distinctly  
**And** duplicate observation does not create duplicate logical success.

## AT-OWNER-001 — Only Contract Owner can pause
**Given** a non-owner wallet  
**When** it calls owner-only pause  
**Then** the transaction cannot change pause state.

## AT-OWNER-002 — Only Contract Owner can change price
**Given** a non-owner wallet  
**When** it attempts to update mint price  
**Then** contract price is unchanged.

## AT-I18N-001 — Locale switch preserves transaction state
**Given** a mint transaction is pending  
**When** the user switches between VI and EN  
**Then** important UI text changes language  
**And** the same transaction continues to be tracked without restarting mint.

## AT-RECOVERY-001 — Chain wins after stale DB restore
**Given** restored DB says token 8 is available  
**But** chain shows token 8 minted to wallet X  
**When** reconciliation/recovery runs  
**Then** product representation is corrected to minted/owner X  
**And** no backup value overrides chain ownership.

## AT-RECOVERY-002 — Core state can be rebuilt
**Given** application operational data is unavailable  
**And** contract plus required IPFS/backup assets remain accessible  
**When** the recovery procedure runs  
**Then** the 10-token Genesis representation, immutable content references and current ownership can be reconstructed sufficiently to restore the public product.

## AT-LICENSE-001 — Holder rights are accessible
**Given** a visitor evaluates or owns a Pigverse NFT  
**When** they open the relevant license/terms surface  
**Then** personal/social use is explained  
**And** commercial/copyright rights are not represented as transferred.
