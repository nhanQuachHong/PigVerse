"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";

import {
  type AdminContentClientError,
  type AdminContentSlot,
  type AdminDraftInput,
  adminContentQuery,
  updateAdminDraft,
} from "../../lib/admin-content";
import { CHARACTER_CATALOG } from "../../lib/character-catalog";
import { type AdminSession, adminSessionQuery } from "../../lib/admin-session";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField, TextAreaField } from "../ui/form-field";
import { Icon } from "../ui/icon";

function errorKey(error: unknown) {
  const code = (error as AdminContentClientError | undefined)?.code;
  if (code === "STALE_EDIT") return "admin.editorErrorStale" as const;
  if (code === "TOKEN_ALREADY_MINTED")
    return "admin.editorErrorMinted" as const;
  if (code === "CHAIN_STATE_UNAVAILABLE")
    return "admin.editorErrorChain" as const;
  return "admin.editorErrorGeneric" as const;
}

function DraftEditor({ slot }: { slot: AdminContentSlot }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const initial: AdminDraftInput = {
    descriptionEn: slot.content?.descriptionEn ?? "",
    descriptionVi: slot.content?.descriptionVi ?? "",
    expectedRevision: slot.content?.revision ?? 0,
    nameEn: slot.content?.nameEn ?? "",
    nameVi: slot.content?.nameVi ?? "",
    storyEn: slot.content?.storyEn ?? "",
    storyVi: slot.content?.storyVi ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const editable = slot.chainState === "unminted";

  const setField = (
    field: Exclude<keyof AdminDraftInput, "expectedRevision">,
    value: string,
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editable) return;
    setSaving(true);
    setSaveError(undefined);
    setSaved(false);
    try {
      const content = await updateAdminDraft(slot.tokenId, draft);
      queryClient.setQueryData<AdminContentSlot[]>(
        adminContentQuery.queryKey,
        (current) =>
          current?.map((candidate) =>
            candidate.tokenId === slot.tokenId
              ? { ...candidate, content }
              : candidate,
          ),
      );
      setDraft((current) => ({
        ...current,
        expectedRevision: content.revision,
      }));
      setSaved(true);
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pv-admin-editor" onSubmit={submit}>
      <div className="pv-admin-editor__heading">
        <div>
          <p className="pv-eyebrow">
            Token #{slot.tokenId} · {t("admin.editorRevision")}{" "}
            {draft.expectedRevision}
          </p>
          <h3>{t("admin.editorTitle")}</h3>
        </div>
        <span
          className={`pv-admin-chain-state pv-admin-chain-state--${slot.chainState}`}
        >
          {t(`admin.chain.${slot.chainState}`)}
        </span>
      </div>
      {!editable && (
        <div className="pv-admin-notice pv-admin-notice--warning" role="alert">
          <Icon name="alert" size={20} />
          <p>
            {slot.chainState === "minted"
              ? t("admin.editorLocked")
              : t("admin.editorChainUnavailable")}
          </p>
        </div>
      )}
      <p className="pv-admin-editor__hint">{t("admin.editorDraftHint")}</p>
      <div className="pv-admin-editor__grid">
        <FormField
          disabled={!editable || saving}
          label={t("admin.editorNameVi")}
          name={`name-vi-${slot.tokenId}`}
          onChange={(event) => setField("nameVi", event.currentTarget.value)}
          value={draft.nameVi}
        />
        <FormField
          disabled={!editable || saving}
          label={t("admin.editorNameEn")}
          name={`name-en-${slot.tokenId}`}
          onChange={(event) => setField("nameEn", event.currentTarget.value)}
          value={draft.nameEn}
        />
        <TextAreaField
          disabled={!editable || saving}
          label={t("admin.editorDescriptionVi")}
          name={`description-vi-${slot.tokenId}`}
          onChange={(event) =>
            setField("descriptionVi", event.currentTarget.value)
          }
          rows={4}
          value={draft.descriptionVi}
        />
        <TextAreaField
          disabled={!editable || saving}
          label={t("admin.editorDescriptionEn")}
          name={`description-en-${slot.tokenId}`}
          onChange={(event) =>
            setField("descriptionEn", event.currentTarget.value)
          }
          rows={4}
          value={draft.descriptionEn}
        />
        <TextAreaField
          disabled={!editable || saving}
          label={t("admin.editorStoryVi")}
          name={`story-vi-${slot.tokenId}`}
          onChange={(event) => setField("storyVi", event.currentTarget.value)}
          rows={7}
          value={draft.storyVi}
        />
        <TextAreaField
          disabled={!editable || saving}
          label={t("admin.editorStoryEn")}
          name={`story-en-${slot.tokenId}`}
          onChange={(event) => setField("storyEn", event.currentTarget.value)}
          rows={7}
          value={draft.storyEn}
        />
      </div>
      <div className="pv-admin-editor__actions">
        <Button disabled={!editable || saving} type="submit">
          {saving ? t("admin.editorSaving") : t("admin.editorSave")}
        </Button>
        {saved && (
          <span className="pv-admin-editor__success" role="status">
            <Icon name="check" size={18} /> {t("admin.editorSaved")}
          </span>
        )}
        {saveError !== undefined && (
          <span className="pv-admin-error" role="alert">
            {t(errorKey(saveError))}
          </span>
        )}
      </div>
    </form>
  );
}

export function AdminContentPanel() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const content = useQuery(adminContentQuery);
  const [selectedTokenId, setSelectedTokenId] = useState(1);

  useEffect(() => {
    if (
      content.isError &&
      (content.error as AdminContentClientError | null)?.code ===
        "ADMIN_AUTH_REQUIRED"
    )
      queryClient.setQueryData<AdminSession>(adminSessionQuery.queryKey, {
        authenticated: false,
      });
  }, [content.error, content.isError, queryClient]);

  if (content.isPending)
    return (
      <Card aria-busy="true" className="pv-admin-content-loading">
        <span className="pv-skeleton pv-skeleton--title" />
        <span className="pv-skeleton pv-skeleton--text" />
      </Card>
    );
  if (content.isError || !content.data)
    return (
      <Card className="pv-admin-content-error" role="alert">
        <Icon name="alert" size={22} />
        <div>
          <h3>{t("admin.editorUnavailableTitle")}</h3>
          <p>{t("admin.editorUnavailable")}</p>
          <Button
            onClick={() => content.refetch()}
            size="sm"
            variant="secondary"
          >
            <Icon name="refresh" size={16} /> {t("common.retry")}
          </Button>
        </div>
      </Card>
    );

  const selected =
    content.data.find((slot) => slot.tokenId === selectedTokenId) ??
    content.data[0];
  if (!selected) return null;

  return (
    <section className="pv-admin-content" id="nft-management">
      <div className="pv-admin-content__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.editorEyebrow")}</p>
          <h2>{t("admin.editorSectionTitle")}</h2>
        </div>
        <Button
          disabled={content.isFetching}
          onClick={() => content.refetch()}
          size="sm"
          variant="ghost"
        >
          <Icon name="refresh" size={16} /> {t("admin.editorRefresh")}
        </Button>
      </div>
      <div className="pv-admin-content__layout">
        <Card className="pv-admin-token-list">
          {content.data.map((slot) => {
            const character = CHARACTER_CATALOG[slot.tokenId - 1];
            if (!character) return null;
            return (
              <button
                aria-current={
                  slot.tokenId === selected.tokenId ? "true" : undefined
                }
                key={slot.tokenId}
                onClick={() => setSelectedTokenId(slot.tokenId)}
                type="button"
              >
                <Image alt="" height={56} src={character.artwork} width={56} />
                <span>
                  <strong>{character.name}</strong>
                  <small>
                    #{slot.tokenId} ·{" "}
                    {slot.content
                      ? `r${slot.content.revision}`
                      : t("admin.editorNoDraft")}
                  </small>
                </span>
                <i
                  aria-hidden="true"
                  className={`pv-admin-chain-dot pv-admin-chain-dot--${slot.chainState}`}
                />
              </button>
            );
          })}
        </Card>
        <Card className="pv-admin-editor-card">
          <DraftEditor
            key={`${selected.tokenId}-${selected.content?.revision ?? 0}`}
            slot={selected}
          />
        </Card>
      </div>
    </section>
  );
}
