# Pigverse Asset Structure

This package separates **canonical NFT artwork**, **production website assets**, and **visual references for Codex**.

## Directory Tree

```text
pigverse_assets_package/
├── README.md
├── docs/
│   ├── GIT_COMMIT_RULES.md
│   ├── ASSET_STRUCTURE.md
│   ├── ASSET_MANIFEST.md
│   └── design/
│       ├── desktop/
│       │   ├── reference-home-desktop.png
│       │   ├── reference-collection-desktop.png
│       │   ├── reference-nft-detail-desktop.png
│       │   ├── reference-my-nfts-desktop.png
│       │   ├── reference-story-desktop.png
│       │   └── reference-admin-desktop.png
│       ├── mobile/
│       │   ├── reference-home-mobile.png
│       │   ├── reference-collection-mobile.png
│       │   └── reference-nft-detail-mobile.png
│       ├── ui-states/
│       │   └── reference-ui-states.png
│       ├── overview/
│       │   ├── reference-design-overview-v1.png
│       │   └── reference-design-overview-v2.png
│       └── original-reference/
│           ├── user-provided-home-reference.png
│           └── generated-home-reference-v1.png
│
└── apps/web/public/
    └── assets/
        ├── nft/
        │   ├── 01-captain-oink.png
        │   ├── 02-mochi.png
        │   ├── 03-professor-truffle.png
        │   ├── 04-chef-pippa.png
        │   ├── 05-sir-snout.png
        │   ├── 06-nova.png
        │   ├── 07-fizz.png
        │   ├── 08-lumi.png
        │   ├── 09-ziggy.png
        │   └── 10-king-truffle.png
        ├── characters/
        │   └── background-removal-needed/
        │       └── README.md
        ├── backgrounds/
        │   ├── hero-world.png
        │   ├── story-world.png
        │   ├── clouds-decoration-source.png
        │   └── footer-landscape.png
        ├── hero/
        │   └── hero-composition-captain-nova-sir-snout-chef.png
        ├── story/
        │   ├── story-oink-town.png
        │   ├── story-crystal-incident.png
        │   └── story-adventure.png
        ├── states/
        │   ├── empty-my-nfts.png
        │   └── error-pig.png
        └── celebration/
            └── mint-celebration.png
```

## Usage Rules

### `apps/web/public/assets/nft/`

These are the canonical 1:1 NFT artworks.

- Preserve the full background.
- Use these files for the NFT artwork / IPFS image unless the approved specification changes.
- Do not crop, recolor, regenerate, or silently replace them after approval.
- UI cards may use scaled versions of these assets.

### `apps/web/public/assets/characters/`

This location is reserved for transparent-background character variants.

Transparent variants are for UI composition only and must not replace the canonical NFT artwork.

### `apps/web/public/assets/backgrounds/`

Reusable production backgrounds.

- `hero-world.png`: hero/landing background.
- `story-world.png`: Story/About background.
- `clouds-decoration-source.png`: full source illustration; create a transparent cloud overlay if needed.
- `footer-landscape.png`: wide footer/section landscape.

### `apps/web/public/assets/hero/`

Pre-composed hero artwork. Use when a fixed four-character hero is desired. Prefer composing transparent approved character assets over a background when responsive control is important.

### `apps/web/public/assets/story/`

Lore illustrations:

- Oink Town / world establishing shot;
- Oink Crystal incident;
- adventure/journey scene.

### `apps/web/public/assets/states/`

Reusable empty/error illustrations.

For flexible UI cards, create transparent versions while preserving these full originals.

### `apps/web/public/assets/celebration/`

Shared mint-success background. The actual minted canonical NFT artwork should be layered into the success UI by the frontend; do not generate ten separate celebration backgrounds.

### `docs/design/`

These are **visual references**, not website bitmap pages.

Codex should use them to reproduce layout, spacing, typography hierarchy, color direction, card geometry, and responsive behavior in real HTML/CSS/components.

Do not ship screenshots as the implementation of the page.

## Visual Source-of-Truth Order

For frontend implementation use this priority:

1. Approved page reference in `docs/design/`.
2. Approved Pigverse design-system documentation in the repository.
3. Shared production assets in `apps/web/public/assets/`.
4. Existing reusable UI components / design tokens.
5. Engineering judgment only where the approved design does not define behavior.

Do not independently redesign the site into a generic dark/neon Web3 theme.
