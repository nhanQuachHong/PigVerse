# Pigverse Functional Requirements

Status values: DRAFT, REVIEW, APPROVED, READY, IN DEVELOPMENT, IMPLEMENTED, TESTED, VERIFIED, RELEASED, DEFERRED, OUT OF SCOPE.

## FR-PUBLIC-001 — View Home
- Description: Present Pigverse, selected featured characters and Genesis mint progress.
- Actor: Guest, Connected Collector.
- Preconditions: Public site reachable.
- Input: Optional locale.
- Behavior: Render hero, Pigverse intro, 3–4 featured NFTs, X/10 minted progress, Explore Collection CTA.
- Output: Bilingual public landing page.
- Validation: Minted count must not exceed 10 and should reflect authoritative chain-derived state.
- Permissions: Public.
- Business Rules: BR-001, BR-007, BR-015.
- Error Cases: Blockchain status unavailable; featured image unavailable.
- Edge Cases: Partial data availability; stale cache.
- Dependencies: Blockchain read provider, content store/IPFS.
- Acceptance Criteria:
  - Given the site is available, when a visitor opens Home, then Pigverse introduction, featured characters and an Explore Collection CTA are visible.
  - Given N Genesis tokens are minted, when Home loads authoritative collection status, then progress displays N/10.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-PUBLIC-002 — View Collection
- Description: Display all 10 Genesis NFTs in a grid.
- Actor: Guest, Connected Collector.
- Preconditions: Genesis content exists.
- Input: Filter All / Available / Minted; locale.
- Behavior: Show all tokens and allow state filtering.
- Output: Collection grid.
- Validation: Exactly 10 Genesis token slots; displayed mint state reconciled with chain.
- Permissions: Public.
- Business Rules: BR-001, BR-002, BR-015.
- Error Cases: Chain/RPC failure, asset failure.
- Edge Cases: NFT minted while page is open.
- Dependencies: Blockchain read, content metadata.
- Acceptance Criteria:
  - Given Genesis content is loaded, when filter is All, then all 10 NFTs are represented.
  - Given a token is minted, when filter is Minted, then that token can appear with owner information.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-PUBLIC-003 — View NFT Detail
- Description: Show a single Pigverse character and its public NFT information.
- Actor: Guest, Connected Collector.
- Preconditions: Token ID belongs to Genesis 1–10.
- Input: Token ID, locale.
- Behavior: Show artwork, name, description, story, status, token ID, owner if minted, contract address, network and explorer links as applicable.
- Output: NFT detail page.
- Validation: Reject/404 token IDs outside Genesis or missing configured content.
- Permissions: Public.
- Business Rules: BR-001, BR-007, BR-011, BR-015.
- Error Cases: Asset unavailable; ownership query unavailable.
- Edge Cases: Token transitions from Available to Minted while viewing.
- Dependencies: IPFS/content, chain read.
- Acceptance Criteria:
  - Given a valid Genesis token ID, when the detail page opens, then the bilingual character content and verifiable NFT identifiers are shown.
  - Given the token is minted, then its current owner is shown from authoritative chain-derived state.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-WALLET-001 — Connect Supported EVM Wallet
- Description: Let users connect a supported EVM wallet using a general wallet connector.
- Actor: Guest.
- Preconditions: Compatible browser/wallet environment.
- Input: Wallet-provider selection.
- Behavior: Request wallet connection and expose connected address to allowed client flows.
- Output: Connected wallet state.
- Validation: Address must be a valid EVM address returned by the wallet provider.
- Permissions: Public.
- Business Rules: BR-006.
- Error Cases: User rejects; provider unavailable; unsupported environment.
- Edge Cases: Account change; chain change; disconnect.
- Dependencies: Wallet connector library TBD.
- Acceptance Criteria:
  - Given a supported wallet is available, when a user approves connection, then the application reflects the connected address.
  - Given the user rejects, then no authenticated/admin state is created.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-MINT-001 — Mint Selected Genesis NFT
- Description: Mint the exact available token selected by the collector.
- Actor: Connected Collector.
- Preconditions: Correct network; token published; token unminted; contract unpaused; sufficient funds for configured mint value + gas.
- Input: Fixed token ID 1–10 and current required value.
- Behavior: Read current contract state, initiate transaction, track pending result, reconcile with final on-chain outcome.
- Output: Successful ownership or a clear failure state.
- Validation: Token ID 1–10; token not already minted; payment equals/fulfills contract rule; contract not paused.
- Permissions: Any connected collector wallet while public mint is enabled.
- Business Rules: BR-001, BR-002, BR-003, BR-004, BR-005, BR-008, BR-009.
- Error Cases: Reject, revert, wrong network, paused, price changed, RPC failure, already minted.
- Edge Cases: Two wallets race; double click; refresh while pending.
- Dependencies: Genesis smart contract, RPC provider.
- Acceptance Criteria:
  - Given token 4 is available and contract is active, when a valid mint transaction for token 4 is confirmed, then token 4 has exactly one owner.
  - Given token 4 was already minted, when another wallet attempts to mint token 4, then the transaction cannot produce a second token 4.
  - Given the contract is paused, when a user attempts to mint, then mint cannot succeed.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-MINT-002 — Mint Pending and Result UX
- Description: Communicate transaction progress and final result.
- Actor: Connected Collector.
- Preconditions: Mint attempt initiated.
- Input: Transaction hash/status.
- Behavior: Show pending; allow page restoration; on success show celebration, artwork, token ID, owner, explorer link, My NFTs and Collection CTAs.
- Output: Clear transaction status.
- Validation: Success may only be shown after authoritative successful chain result.
- Permissions: Initiating wallet; public minted state after confirmation.
- Business Rules: BR-009, BR-015.
- Error Cases: Revert; dropped/replaced transaction; provider unavailable.
- Edge Cases: User refreshes or disconnects while pending.
- Dependencies: RPC/explorer.
- Acceptance Criteria:
  - Given a transaction is pending, when the page reloads and the transaction can be resolved, then the UI restores the correct eventual result.
  - Given the transaction fails, then the UI must not mark the NFT as owned by the user.
- Planned Phase: Phase 1/2.
- Status: APPROVED.

## FR-MINT-003 — Display Mint Paused State
- Description: Keep collection visible while disabling new mints when contract is paused.
- Actor: Guest, Connected Collector.
- Preconditions: Contract paused.
- Input: Contract pause state.
- Behavior: Keep NFTs visible; disable Mint; show Minting paused.
- Output: Read-only collection experience.
- Validation: UI state must follow contract pause state.
- Permissions: Public.
- Business Rules: BR-005.
- Error Cases: Unable to read pause state.
- Edge Cases: Pause occurs while user has an already-submitted transaction.
- Dependencies: Contract/RPC.
- Acceptance Criteria:
  - Given the contract is paused, when a user opens an available NFT, then Mint is disabled and a paused notice is visible.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-WALLET-002 — View My NFTs
- Description: Show Genesis NFTs currently owned by connected wallet.
- Actor: Connected Collector.
- Preconditions: Wallet connected.
- Input: Connected wallet address.
- Behavior: Read current Genesis ownership and show matching tokens.
- Output: Owned NFT list or empty state.
- Validation: Must not infer ownership solely from application DB.
- Permissions: Connected user can query their own connected wallet; ownership itself is public chain data.
- Business Rules: BR-009, BR-015.
- Error Cases: RPC unavailable.
- Edge Cases: NFT transferred externally after mint; ownership changes while viewing.
- Dependencies: Contract/RPC.
- Acceptance Criteria:
  - Given the wallet owns no Genesis NFT, when My NFTs opens, then show an empty state and Explore Pigverse CTA.
  - Given ownership changes on-chain, then refreshed My NFTs reflects current ownership.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-ADMIN-001 — Authenticate Admin by Wallet Signature
- Description: Authenticate authorized Admin wallets using a nonce/challenge and wallet signature.
- Actor: Application Admin.
- Preconditions: Wallet connected.
- Input: Wallet address, issued nonce/challenge, signature.
- Behavior: Verify signature, nonce validity and Admin authorization; create session.
- Output: Admin session or denial.
- Validation: Nonce single-use and expiring; signature must match wallet; wallet must be authorized.
- Permissions: Authorized Admin wallets only.
- Business Rules: BR-010, BR-013.
- Error Cases: Invalid/replayed/expired nonce; unauthorized wallet; session creation failure.
- Edge Cases: Admin removed after session issuance.
- Dependencies: Backend auth/session system.
- Acceptance Criteria:
  - Given a non-admin wallet, when it signs a valid challenge, then Admin access is denied.
  - Given an authorized wallet signs a current unused challenge, then an Admin session can be established.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-ADMIN-002 — Manage NFT Draft Content
- Description: Allow Admin to create/edit Genesis content before mint.
- Actor: Application Admin.
- Preconditions: Active Admin session; NFT not minted.
- Input: Name, VI/EN description, VI/EN story, artwork and other configured metadata.
- Behavior: Save draft changes and record audit history.
- Output: Updated draft.
- Validation: Token ID must be 1–10 and unique; required bilingual fields before publish; minted tokens immutable.
- Permissions: Admin only.
- Business Rules: BR-001, BR-007, BR-010, BR-011, BR-012.
- Error Cases: Concurrent edit; token minted during edit; validation error.
- Edge Cases: Stale form after another admin edits.
- Dependencies: Application data store/audit log.
- Acceptance Criteria:
  - Given a token is unminted, when an Admin edits valid content, then the draft is saved and an audit record exists.
  - Given a token is minted, when an Admin attempts to alter protected content, then the operation is rejected.
- Planned Phase: Phase 1/2.
- Status: APPROVED.

## FR-ASSET-001 — Publish Artwork and Metadata to IPFS
- Description: Process Admin-uploaded artwork, persist backup, create metadata, upload to IPFS, and reach READY only after required steps succeed.
- Actor: Application Admin.
- Preconditions: Valid draft and artwork.
- Input: Artwork and metadata fields.
- Behavior: Upload artwork to IPFS and backup, create metadata, upload metadata to IPFS, store resulting identifiers/status.
- Output: READY asset package or ERROR.
- Validation: Required content present; supported media rules TBD; no publish until all required durability checks succeed.
- Permissions: Admin only.
- Business Rules: BR-007, BR-012, BR-014.
- Error Cases: Artwork upload fail; metadata upload fail; backup fail; timeout.
- Edge Cases: Partial success then retry; duplicate retry.
- Dependencies: IPFS provider TBD, backup provider TBD.
- Acceptance Criteria:
  - Given artwork upload succeeds but metadata upload fails, then the NFT is not publishable and enters ERROR/retry state.
  - Given all required asset steps succeed, then the NFT may enter READY.
- Planned Phase: Phase 2.
- Status: APPROVED.

## FR-ADMIN-003 — Publish/Unpublish Unminted NFT
- Description: Control public availability of prepared unminted NFTs.
- Actor: Application Admin.
- Preconditions: Active Admin session; NFT unminted; asset state READY for publish.
- Input: Publish/unpublish action.
- Behavior: Move between READY and PUBLISHED/AVAILABLE where valid.
- Output: Updated publication state.
- Validation: Minted NFT cannot be unpublished as a means to erase it from collection; missing/failed assets cannot be published.
- Permissions: Admin only.
- Business Rules: BR-011, BR-012.
- Error Cases: Token minted concurrently; asset state invalid.
- Edge Cases: Two admins act concurrently.
- Dependencies: Chain reconciliation + content store.
- Acceptance Criteria:
  - Given an unminted READY token, when Admin publishes it, then it becomes visible as available if contract conditions permit.
  - Given a token is minted, then unpublish cannot hide the existence of that token from the Genesis collection.
- Planned Phase: Phase 1/2.
- Status: APPROVED.

## FR-ADMIN-004 — View Audit History
- Description: Display Admin content/metadata changes and important administrative actions.
- Actor: Application Admin.
- Preconditions: Active Admin session.
- Input: Optional filters TBD.
- Behavior: Show actor wallet, action, affected NFT/resource, timestamp and change context as defined by audit policy.
- Output: Audit history.
- Validation: Audit entries must be append-only from normal product operations.
- Permissions: Admin only.
- Business Rules: BR-010, BR-013.
- Error Cases: Audit store unavailable.
- Edge Cases: Removed admin appears historically.
- Dependencies: Audit log.
- Acceptance Criteria:
  - Given an Admin changes NFT draft content, then a corresponding audit entry is available.
- Planned Phase: Phase 2.
- Status: APPROVED.

## FR-ADMIN-005 — View Mint Activity
- Description: Show mint-related activity including wallet, NFT, transaction hash, status and time.
- Actor: Application Admin.
- Preconditions: Active Admin session.
- Input: Activity query/filter TBD.
- Behavior: Reconcile recorded activity with on-chain data where applicable.
- Output: Mint activity view.
- Validation: Failed/pending/success states must not be conflated.
- Permissions: Admin only.
- Business Rules: BR-009, BR-013.
- Error Cases: Explorer/RPC unavailable.
- Edge Cases: Reorg/replaced transaction; duplicate observed event.
- Dependencies: RPC/indexing approach TBD.
- Acceptance Criteria:
  - Given a confirmed mint exists, then Admin can see its token, owner wallet, tx hash, success status and time.
- Planned Phase: Phase 2.
- Status: APPROVED.

## FR-CONTRACT-001 — Pause/Unpause Minting
- Description: Allow Contract Owner to stop or resume new mint calls.
- Actor: Contract Owner.
- Preconditions: Correct owner wallet and network.
- Input: Pause/unpause transaction.
- Behavior: Contract changes pause state under owner authorization.
- Output: New on-chain pause state.
- Validation: Non-owner calls rejected.
- Permissions: Contract Owner only.
- Business Rules: BR-005, BR-010.
- Error Cases: Revert, wrong network, wrong wallet.
- Edge Cases: Mints already pending when pause is confirmed.
- Dependencies: Smart contract.
- Acceptance Criteria:
  - Given a non-owner wallet, when it calls the owner-only pause function, then the transaction cannot successfully change pause state.
- Planned Phase: Phase 1.
- Status: APPROVED.

## FR-CONTRACT-002 — Configure Mint Price
- Description: Allow Contract Owner to update the mint price used by the contract.
- Actor: Contract Owner.
- Preconditions: Correct owner wallet/network.
- Input: New mint price.
- Behavior: Contract stores new active price.
- Output: Updated price.
- Validation: Monetary validation rules and units must be explicit in implementation contract; Mainnet value is TBD.
- Permissions: Contract Owner only.
- Business Rules: BR-004, BR-010.
- Error Cases: Unauthorized call; invalid value if constrained by contract.
- Edge Cases: Price changes while user is preparing transaction.
- Dependencies: Smart contract.
- Acceptance Criteria:
  - Given a new price is confirmed on-chain, then subsequent mint attempts must use the current contract price.
- Planned Phase: Phase 1/3.
- Status: APPROVED.

## FR-I18N-001 — Bilingual Important Content
- Description: Provide Vietnamese and English variants for important public UI/content.
- Actor: All.
- Preconditions: Translation content exists.
- Input: Locale selection/default.
- Behavior: Render UI, descriptions, stories and important mint states in selected supported language.
- Output: VI or EN experience.
- Validation: Required bilingual fields must exist before publication where configured as mandatory.
- Permissions: Public.
- Business Rules: BR-007.
- Error Cases: Missing translation fallback behavior is TBD.
- Edge Cases: Locale switch while transaction pending.
- Dependencies: Localization framework TBD.
- Acceptance Criteria:
  - Given content has VI and EN versions, when locale changes, then the corresponding important content is displayed without changing NFT ownership or transaction state.
- Planned Phase: Phase 1/2.
- Status: APPROVED.

## FR-RECOVERY-001 — Reconstruct Authoritative NFT State
- Description: Support recovery of core Genesis state from blockchain + IPFS + backup storage if application data is lost.
- Actor: Operator/Admin.
- Preconditions: Contract, IPFS and/or backup are accessible.
- Input: Contract address/network, IPFS identifiers/backups.
- Behavior: Rebuild enough state to accurately represent tokens, immutable content and ownership.
- Output: Restored application representation.
- Validation: Recovered ownership must match chain.
- Permissions: Operational procedure; destructive recovery actions restricted.
- Business Rules: BR-009, BR-014, BR-015.
- Error Cases: Provider unavailable; backup incomplete; metadata mismatch.
- Edge Cases: Application DB contains stale/conflicting values.
- Dependencies: Recovery tooling/runbook TBD.
- Acceptance Criteria:
  - Given application state is lost but chain and required content stores remain available, then core Genesis ownership and immutable content can be reconstructed without inventing ownership from backups.
- Planned Phase: Production Hardening.
- Status: APPROVED.

## FR-LICENSE-001 — Present Holder License
- Description: Clearly communicate that NFT ownership does not grant copyright or commercial-use rights.
- Actor: Guest, Collector.
- Preconditions: License text approved.
- Input: None.
- Behavior: Make license accessible from relevant public surfaces.
- Output: Human-readable license disclosure.
- Validation: Legal wording must be approved before Mainnet release.
- Permissions: Public.
- Business Rules: BR-016.
- Error Cases: N/A.
- Edge Cases: NFT transferred to a new owner; license terms should remain accessible.
- Dependencies: Final legal text TBD.
- Acceptance Criteria:
  - Given a user evaluates or owns a Pigverse NFT, then the product provides accessible terms explaining permitted personal/social use and excluded commercial rights.
- Planned Phase: Phase 1/Mainnet readiness.
- Status: APPROVED.
