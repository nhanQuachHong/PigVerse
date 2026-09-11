# Pigverse Frontend Foundation

## Purpose

M1 establishes the reusable visual and interaction system. Full Home, Collection, NFT Detail, Mint, My NFTs, Story and Admin workflows remain assigned to their roadmap milestones.

## Visual Contract

- Approved references in `docs/design/` define composition, hierarchy and visual direction.
- Runtime assets live under `apps/web/public/assets/`; canonical NFT images must not be changed or replaced by UI variants.
- Pink is the primary action/status accent, navy is the core text color, and pastel blue/green/purple are supporting semantic colors.
- Public experiences use soft atmospheric backgrounds, rounded white surfaces and the same container grid.
- Admin experiences use the same tokens with a denser shell; privileged behavior is not implied by the shell.

## Component Contract

- Reuse `Button`, `Card`, `FormField`, `NFTCard`, `NFTStatusBadge`, `WalletButton`, `PageContainer`, `SectionHeading`, `Modal`, feedback states and toast notifications.
- Extend shared components when a new approved state is needed. Do not fork page-specific replacements.
- Use centralized icons from `Icon`; introduce an external icon library only through a recorded engineering decision.
- Product routes may exist as shared-shell placeholders before their milestone, but may not simulate unimplemented wallet, chain or admin behavior.

## Responsive and Accessibility Baseline

- Container width is capped at 1200px with fluid gutters.
- Primary breakpoints are 992px for compact navigation/layout and 672px for mobile stacking.
- Interactive controls require visible focus, semantic roles/labels and keyboard operation.
- Modals move focus inside, close on Escape and restore the prior focus target.
- Reduced-motion preferences disable nonessential animation.

## Localization

- `vi` and `en` are the only foundation locales.
- Translation keys are typed and share the same key set.
- Locale preference is persisted in browser storage; Vietnamese is the initial fallback.
- Content-backed translations and missing-content policy are completed with their functional milestones.

## Visual Regression

- Playwright captures the foundation gallery at 1440×900 desktop and an iPhone 13 viewport.
- Baselines are reviewed changes, not automatically accepted output.
- Run `pnpm test:e2e` to compare; use `pnpm --filter @pigverse/web test:e2e:update` only when the visual change is intentional and reviewed against approved references.
