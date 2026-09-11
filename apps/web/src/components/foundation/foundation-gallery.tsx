"use client";

import Image from "next/image";
import { useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { Button, ButtonLink } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState, ErrorState, NFTCardSkeleton } from "../ui/feedback-state";
import { FormField } from "../ui/form-field";
import { Icon } from "../ui/icon";
import { Modal } from "../ui/modal";
import { NFTCard } from "../ui/nft-card";
import { NFTStatusBadge } from "../ui/nft-status-badge";
import { PageContainer } from "../ui/page-container";
import { SectionHeading } from "../ui/section-heading";
import { useToast } from "../ui/toast";
import { WalletButton } from "../ui/wallet-button";

const sampleNfts = [
  {
    description: "To the moon… and beyond!",
    imageAlt: "Captain Oink in a space suit",
    imageSrc: "/assets/nft/01-captain-oink.png",
    name: "Captain Oink",
    status: "minted" as const,
    tokenId: 1,
  },
  {
    description: "A tiny adventurer with a very big heart.",
    imageAlt: "Mochi exploring a floating island",
    imageSrc: "/assets/nft/02-mochi.png",
    name: "Mochi",
    status: "available" as const,
    tokenId: 2,
  },
  {
    description: "Curiosity powers every new invention.",
    imageAlt: "Professor Truffle in a sky laboratory",
    imageSrc: "/assets/nft/03-professor-truffle.png",
    name: "Professor Truffle",
    status: "coming-soon" as const,
    tokenId: 3,
  },
];

export function FoundationGallery() {
  const { t } = useLocale();
  const { notify } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="pv-foundation-hero">
        <PageContainer className="pv-foundation-hero__inner">
          <div>
            <p className="pv-eyebrow">{t("foundation.eyebrow")}</p>
            <h1>{t("foundation.title")}</h1>
            <p>{t("foundation.description")}</p>
            <div className="pv-foundation-hero__actions">
              <ButtonLink href="#components">
                {t("foundation.preview")} <Icon name="arrow" size={17} />
              </ButtonLink>
              <Button onClick={() => setModalOpen(true)} variant="secondary">
                Modal preview
              </Button>
            </div>
          </div>
          <Image
            alt="Pigverse heroes on a floating island"
            className="pv-foundation-hero__art"
            height={754}
            priority
            src="/assets/hero/hero-composition-captain-nova-sir-snout-chef.png"
            width={2086}
          />
        </PageContainer>
      </section>

      <PageContainer className="pv-foundation-content" id="components">
        <section>
          <SectionHeading
            description="Reusable geometry, status and asset behavior for every collection surface."
            eyebrow="Cards"
            title="NFT primitives"
          />
          <div className="pv-nft-grid">
            {sampleNfts.map((nft) => (
              <NFTCard
                href={`/nft/${nft.tokenId}`}
                key={nft.tokenId}
                {...nft}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="System" title={t("foundation.states")} />
          <div className="pv-foundation-grid pv-foundation-grid--states">
            <Card className="pv-state-card">
              <h3>NFT status badges</h3>
              <div className="pv-badge-row">
                <NFTStatusBadge status="available" />
                <NFTStatusBadge status="minted" />
                <NFTStatusBadge status="minting" />
                <NFTStatusBadge status="paused" />
                <NFTStatusBadge status="coming-soon" />
              </div>
            </Card>
            <Card className="pv-state-card">
              <h3>Wallet states</h3>
              <div className="pv-wallet-row">
                <WalletButton />
                <WalletButton state="connected" />
                <WalletButton state="wrong-network" />
              </div>
            </Card>
            <Card className="pv-state-card">
              <h3>Loading</h3>
              <NFTCardSkeleton />
            </Card>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Feedback" title={t("foundation.forms")} />
          <div className="pv-foundation-grid">
            <Card className="pv-form-demo">
              <FormField
                hint="Public name, 2–40 characters."
                label="Character name"
                name="character-name"
                placeholder="Captain Oink"
              />
              <FormField
                error="A bilingual story is required before publishing."
                label="Story (VI)"
                name="story-vi"
                placeholder="Ngày xửa ngày xưa…"
              />
              <div className="pv-button-row">
                <Button onClick={() => notify("Draft saved.", "success")}>
                  Save draft
                </Button>
                <Button
                  onClick={() =>
                    notify("Please check the required fields.", "error")
                  }
                  variant="secondary"
                >
                  Validate
                </Button>
              </div>
            </Card>
            <Card>
              <EmptyState />
            </Card>
            <Card>
              <ErrorState onRetry={() => notify("Trying again…")} />
            </Card>
          </div>
        </section>
      </PageContainer>

      <Modal
        description="Keyboard focus moves into the dialog and Escape closes it."
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Shared Pigverse modal"
      >
        <Button onClick={() => setModalOpen(false)}>Looks good</Button>
      </Modal>
    </>
  );
}
