# Owner/Admin role — Product Owner approval

Status: APPROVED by the Product Owner in the project conversation.

The current Contract Owner is also the application Admin. The following matrix
supersedes earlier requirements separating Application Admin and Contract Owner
or allowing independently authorized Admin wallets for Genesis.

| Action | User | Owner/Admin |
| --- | --- | --- |
| View NFT | Yes | Yes |
| Mint NFT | Yes | Yes |
| Edit unminted NFT | No | Yes |
| Publish/unpublish unminted NFT | No | Yes |
| Pause/unpause | No | Yes |
| Change mint price | No | Yes |
| Withdraw | No | Yes |

Owner/Admin uses the same public mint conditions as User. No reserved tokens,
admin mint bypass, burn or post-mint edits are introduced.

Backend authentication still requires a valid single-use wallet challenge and
session. Authorization must check the current on-chain owner; a previous owner
must lose privileged access after ownership transfer. A chain read failure must
not grant privileges. On-chain publish/unpublish, pause, price and withdrawal
operations require the owner wallet's transaction, not a backend-held private key.

This resolves the publication authority question: owner-only on-chain publication
is now consistent with the approved role matrix. Backend asset readiness and
revision checks remain necessary before publication. Withdrawal authority is
approved; beneficiary routing and transfer-failure behavior must be explicit in
the implementation and its tests. No Mainnet mint price is selected here.

Affected sources: PRODUCT roles/personas, BR-010/019, SEC-AUTHZ-002,
FR-ADMIN-001/003, FR-CONTRACT-001/002, OD-002 and contract ADRs 0003/0004.
Older text expressing separate roles is historical and is superseded by this
decision while those sections are migrated.
