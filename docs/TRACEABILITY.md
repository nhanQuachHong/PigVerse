# Pigverse Requirement Traceability

| Requirement | Key Rules | Engineering Component(s) | Verification | Milestone |
|---|---|---|---|---|
| FR-PUBLIC-001 | BR-001,007,015 | Public Web, Public API, Chain Read | AT-PUBLIC-001 | M1/M3 |
| FR-PUBLIC-002 | BR-001,002,015 | Public Web, Public API, Chain Read | AT-PUBLIC-002 | M1/M3 |
| FR-PUBLIC-003 | BR-001,007,011,015 | Public Web, Public API, IPFS, Chain Read | AT-PUBLIC-003 | M1/M4 |
| FR-WALLET-001 | BR-006 | Wallet Connector | AT-WALLET-001 unit + deterministic injected-browser coverage; named live-wallet matrix pending | M1/M5 |
| FR-MINT-001 | BR-001,002,003,004,005,008,009 | Contract, Wallet, Chain Client | AT-MINT-001,002,003,005 unit/contract + deterministic exact-transaction, fresh-price/pause, RPC recovery and wallet-rejection browser coverage; live Base Sepolia pending | M2/M5 |
| FR-MINT-002 | BR-009,015 | Mint UX, Tx Resolver | AT-MINT-004 unit + deterministic pending/restore/success/revert browser coverage; live Base Sepolia pending | M1/M5 |
| FR-MINT-003 | BR-005 | Contract, Public UI | AT-MINT-003 unit/contract + deterministic stale-page/fresh-pause browser coverage; live Base Sepolia pending | M1/M2/M5 |
| FR-WALLET-002 | BR-009,015 | My NFTs, Chain Read | AT-MYNFT-001,002 unit/API + deterministic connected-browser coverage; live transfer pending | M1/M6 |
| FR-ADMIN-001 | BR-010,013 | Auth API, Admin Authorization, Session | AT-ADMIN-001,002,003 | M1/M8 |
| FR-ADMIN-002 | BR-001,007,010,011,012 | Admin UI/API, Content, Audit | AT-ADMIN-004,005 | M1/M9 |
| FR-ASSET-001 | BR-007,012,014 | Asset Pipeline, IPFS, Backup | AT-ASSET-001,002 | M9 |
| FR-ADMIN-003 | BR-011,012 | Admin UI/API, Content, Chain Recheck | AT-PUBLISH-001,002 + authoritative receipt-state unit coverage; Admin browser/live chain pending | M1/M9 |
| FR-ADMIN-004 | BR-010,013 | Audit Module | AT-AUDIT-001 | M1/M9 |
| FR-ADMIN-005 | BR-009,013 | Mint Activity/Reconciliation | AT-ACTIVITY-001 | M1/M9 |
| FR-CONTRACT-001 | BR-005,010 | Genesis Contract | AT-OWNER-001, AT-MINT-003 + focused source/static review; live deployment pending | M2/M10 |
| FR-CONTRACT-002 | BR-004,010 | Genesis Contract | AT-OWNER-002, AT-MINT-005 + focused source/static review; live deployment pending | M2/M10 |
| FR-I18N-001 | BR-007 | i18n, Content | AT-I18N-001 | M1/M3-M9/M13 |
| FR-RECOVERY-001 | BR-009,014,015 | Reconciliation, Recovery, Ops | Chain snapshot unit/CLI foundation; AT-RECOVERY-001,002 pending live content drill | M14 |
| FR-LICENSE-001 | BR-016 | Public UI/Content | AT-LICENSE-001 | M1/M4/M7/M13 |

## Product Goal Traceability

| Product Goal | Requirements / Rules | Milestones |
|---|---|---|
| Complete end-to-end Genesis mint | FR-PUBLIC-*, FR-WALLET-*, FR-MINT-* | M1-M6 |
| No duplicate Genesis token | BR-001/002, FR-MINT-001, NFR-REL-001 | M2/M5 |
| Blockchain-authoritative ownership | BR-009, FR-WALLET-002, FR-RECOVERY-001 | M5/M6/M14 |
| Immutable minted content | BR-011, FR-ADMIN-002/003, contract design | M2/M9 |
| Secure Admin operations | FR-ADMIN-001..005, NFR-SEC-* | M8-M10 |
| VI/EN important content | FR-I18N-001, BR-007 | M1/M3-M9/M13 |
| Recoverability | BR-014, FR-RECOVERY-001, NFR-REL-008..010 | M9/M14-M16 |
| Mainnet production readiness | all approved requirements + NFRs | M10-M18 |

## Status Rule

Do not move a requirement from IMPLEMENTED to VERIFIED until its acceptance criteria and linked verification pass. Do not mark RELEASED before the release milestone and deployment verification.
