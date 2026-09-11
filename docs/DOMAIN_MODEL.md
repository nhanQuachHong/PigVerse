# Pigverse Domain Model

This is a conceptual/domain model. It does not require one database table per object.

## 1. GenesisCollection

### Responsibility
Represents the approved Pigverse Genesis collection identity.

### Invariants
- Exactly 10 token slots.
- Fixed IDs 1..10.
- Genesis max supply cannot be increased.
- Future collections cannot mutate Genesis identity.

### Important attributes
- collection code/name;
- network deployment reference;
- contract address;
- max supply = 10;
- public/story metadata.

## 2. GenesisTokenSlot

### Responsibility
Represents one conceptual Pigverse character/token ID before and after on-chain mint.

### Identity
`tokenId` in 1..10.

### Important attributes
- token ID;
- character content reference;
- publication state;
- active asset package;
- chain mint/owner projection.

### Invariants
- token ID unique and fixed;
- at most one successful mint;
- once minted, protected content cannot be changed/unpublished to erase it;
- chain owner is authoritative.

### Ownership
Collector ownership exists only on-chain after mint.

## 3. CharacterContent

### Responsibility
Author-managed localized character content.

### Important attributes
- name;
- description VI/EN;
- story VI/EN;
- artwork association;
- revision/version;
- status.

### Lifecycle
Editable while unminted. Frozen/protected once token is minted.

### Invariants
Required bilingual fields must satisfy publication policy.

## 4. AssetPackage

### Responsibility
Durable artwork + metadata references for a specific content revision.

### Important attributes
- content revision ID;
- artwork IPFS CID/reference;
- artwork backup reference;
- metadata IPFS CID/reference;
- metadata backup reference;
- processing status;
- safe error/retry data.

### Invariants
`READY` only when all required asset and backup operations succeed.

## 5. Publication

### Responsibility
Controls whether an unminted prepared token is publicly mintable/visible as available.

### States
`DRAFT/NOT_READY`, `READY`, `PUBLISHED` with chain-mint state considered separately.

### Invariants
- cannot publish incomplete assets;
- may unpublish only while unminted;
- minted tokens remain visible.

## 6. WalletIdentity

### Responsibility
Represents externally controlled EVM wallet identity.

### Important attributes
- normalized EVM address;
- current client connection/account/chain context (ephemeral).

### Invariants
Pigverse never receives private key/seed phrase.

### Roles
A wallet may be collector, Application Admin, Contract Owner, or multiple roles simultaneously. Roles are logically independent.

## 7. AdminAuthorization

### Responsibility
Determines which wallet addresses can use application-level Admin operations.

### Important attributes
- wallet address;
- status authorized/revoked;
- timestamps/audit metadata;
- optional label.

### Invariants
Authorization is enforced server-side.

## 8. AuthChallenge

### Responsibility
Single-use wallet-signature login challenge.

### Important attributes
- nonce/challenge ID;
- wallet address/intended subject;
- issue/expiry time;
- used state;
- domain/origin/chain context as chosen by auth standard.

### Lifecycle
`ISSUED -> USED` or `ISSUED -> EXPIRED`.

### Invariants
Cannot be reused.

## 9. AdminSession

### Responsibility
Authenticated application session after valid wallet-signature verification.

### Important attributes
- session ID/reference;
- admin wallet;
- issued/expiry;
- revocation state if supported.

### Invariants
Sensitive operations must still pass current authorization checks according to final revocation policy.

## 10. AuditEvent

### Responsibility
Append-only accountability record for important Admin/security/content operations.

### Important attributes
- event ID;
- actor wallet;
- action type;
- target;
- timestamp;
- correlation ID;
- safe before/after/change data.

### Invariants
Normal product operations do not edit/delete historical audit events.

## 11. MintObservation

### Responsibility
Operational projection of an observed transaction/event for Admin activity and user recovery.

### Important attributes
- token ID;
- wallet/address involved;
- tx hash;
- chain/network;
- observed status;
- block/receipt references;
- timestamps.

### Authority
Never supersedes the chain.

## 12. DeploymentConfig

### Responsibility
Explicitly identifies a Pigverse deployment environment.

### Important attributes
- environment name;
- chain ID/network;
- contract address;
- explorer mapping;
- RPC configuration reference;
- feature/config flags that do not alter approved business behavior.

### Invariants
Sepolia and Mainnet configuration must not be silently interchangeable.
