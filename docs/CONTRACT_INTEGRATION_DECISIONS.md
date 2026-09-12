# Contract integration decisions required for M2

Status: awaiting Product Owner direction; abstract contract components are
verified locally but no concrete product contract is ready for deployment.

## Publication authority and synchronization

Sources: PRODUCT roles matrix, FR-ADMIN-003, FR-MINT-001, BR-010/011/012,
API-ADMIN-003/004 and STATE_MACHINES publication transitions.

Application Admin may publish/unpublish complete unminted content. Contract
Owner does not receive this permission unless independently authorized as an
Admin. A public mint must not accept an arbitrary collector-provided tokenURI
or mint an unpublished revision. Database-only eligibility cannot enforce this
against direct contract callers.

The specification does not yet choose who submits publication state to the
chain or how that authority follows Admin revocation (also OD-002). Candidate
designs are Admin-signed publication transactions with a separately governed
authorization registry, or an explicitly authorized service signer that
relays verified backend publication state. The latter introduces service-key
custody and operational recovery responsibilities. Neither option is approved
by this document. Assigning publication to Contract Owner alone would change
the approved role separation.

The selected design must specify who grants/revokes publication authority,
how in-flight publish/unpublish operations are reconciled, and which confirmed
revision the collector commits to. Minted content must remain immutable even
after publication authority is compromised or revoked.

## Paid mint proceeds

Sources: FR-CONTRACT-002 and BR-004 define price administration, not entitlement
to proceeds or withdrawal permissions. Base Sepolia starts free; the price can
subsequently change. A payable contract must not silently trap funds or assume
that price administration implies treasury control.

Before the concrete paid-mint path is completed, select the beneficiary and
withdrawal authority, whether the beneficiary may change, and the behavior if
the recipient rejects native-currency transfers. This decision is separate
from the Mainnet price (OD-009). Do not request private keys to resolve it.

## Work that remains independent

Public content models, chain-read projections, frontend pages and asset
validation can proceed against explicit interfaces while these decisions are
pending. Their mocks must not be represented as a verified production mint or
publishing integration. M2 and the full product remain incomplete.
