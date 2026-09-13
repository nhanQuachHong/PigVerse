import type { Sql } from "postgres";

export type LocalizedDraft = {
  descriptionEn: string;
  descriptionVi: string;
  nameEn: string;
  nameVi: string;
  storyEn: string;
  storyVi: string;
};

export type ContentLifecycle =
  | "DRAFT"
  | "PROCESSING_ASSETS"
  | "ERROR"
  | "READY"
  | "PUBLISHED"
  | "MINTED_LOCKED";

export type ContentRevision = LocalizedDraft & {
  contentId: string;
  deploymentKey: string;
  lifecycleState: ContentLifecycle;
  revision: number;
  tokenId: number;
  updatedAt: Date;
};

export type DraftWrite = LocalizedDraft & {
  actorWallet: `0x${string}`;
  correlationId: string;
  deploymentKey: string;
  expectedRevision: number;
  tokenId: number;
};

export type DraftWriteResult =
  | { content: ContentRevision; status: "updated" }
  | { status: "conflict" | "minted-locked" };

const localizedDraftFields: Array<keyof LocalizedDraft> = [
  "nameVi",
  "nameEn",
  "descriptionVi",
  "descriptionEn",
  "storyVi",
  "storyEn",
];

export interface AdminContentStore {
  listCurrent(deploymentKey: string): Promise<ContentRevision[]>;
  replaceDraft(
    input: DraftWrite,
    confirmUnminted: () => Promise<boolean>,
  ): Promise<DraftWriteResult>;
}

type ContentRow = {
  content_id: string;
  deployment_key: string;
  description_en: string;
  description_vi: string;
  lifecycle_state: ContentLifecycle;
  name_en: string;
  name_vi: string;
  revision: number;
  story_en: string;
  story_vi: string;
  token_id: number;
  updated_at: Date;
};

function fromRow(row: ContentRow): ContentRevision {
  return {
    contentId: String(row.content_id),
    deploymentKey: row.deployment_key,
    descriptionEn: row.description_en,
    descriptionVi: row.description_vi,
    lifecycleState: row.lifecycle_state,
    nameEn: row.name_en,
    nameVi: row.name_vi,
    revision: Number(row.revision),
    storyEn: row.story_en,
    storyVi: row.story_vi,
    tokenId: Number(row.token_id),
    updatedAt: row.updated_at,
  };
}

export class PostgresAdminContentStore implements AdminContentStore {
  constructor(private readonly sql: Sql) {}

  async listCurrent(deploymentKey: string) {
    const rows = await this.sql<ContentRow[]>`
      SELECT content_id, deployment_key, token_id, revision, lifecycle_state,
             name_vi, name_en, description_vi, description_en, story_vi,
             story_en, updated_at
      FROM nft_contents
      WHERE deployment_key = ${deploymentKey} AND is_current
      ORDER BY token_id
    `;
    return rows.map(fromRow);
  }

  async replaceDraft(
    input: DraftWrite,
    confirmUnminted: () => Promise<boolean>,
  ): Promise<DraftWriteResult> {
    return this.sql.begin(async (transaction) => {
      const currentRows = await transaction<ContentRow[]>`
        SELECT content_id, deployment_key, token_id, revision, lifecycle_state,
               name_vi, name_en, description_vi, description_en, story_vi,
               story_en, updated_at
        FROM nft_contents
        WHERE deployment_key = ${input.deploymentKey}
          AND token_id = ${input.tokenId}
          AND is_current
        FOR UPDATE
      `;
      const current = currentRows[0] ? fromRow(currentRows[0]) : null;
      if ((current?.revision ?? 0) !== input.expectedRevision)
        return { status: "conflict" };
      if (!(await confirmUnminted())) return { status: "minted-locked" };

      const revision = (current?.revision ?? 0) + 1;
      if (current)
        await transaction`
          UPDATE nft_contents
          SET is_current = false
          WHERE content_id = ${current.contentId} AND is_current
        `;
      const inserted = await transaction<ContentRow[]>`
        INSERT INTO nft_contents (
          deployment_key, token_id, revision, lifecycle_state, name_vi,
          name_en, description_vi, description_en, story_vi, story_en
        ) VALUES (
          ${input.deploymentKey}, ${input.tokenId}, ${revision}, 'DRAFT',
          ${input.nameVi}, ${input.nameEn}, ${input.descriptionVi},
          ${input.descriptionEn}, ${input.storyVi}, ${input.storyEn}
        )
        RETURNING content_id, deployment_key, token_id, revision,
                  lifecycle_state, name_vi, name_en, description_vi,
                  description_en, story_vi, story_en, updated_at
      `;
      const content = inserted[0];
      if (!content) throw new Error("Draft write did not return content");
      const changedFields = localizedDraftFields.filter(
        (key) => !current || current[key] !== input[key],
      );
      await transaction`
        INSERT INTO audit_events (
          deployment_key, actor_wallet, action, target_type, target_id,
          token_id, correlation_id, safe_context
        ) VALUES (
          ${input.deploymentKey}, ${input.actorWallet}, 'NFT_DRAFT_UPDATED',
          'NFT_CONTENT', ${String(content.content_id)}, ${input.tokenId},
          ${input.correlationId}, ${transaction.json({
            changedFields,
            fromRevision: current?.revision ?? 0,
            toRevision: revision,
          })}
        )
      `;
      return { content: fromRow(content), status: "updated" };
    });
  }
}

export class MemoryAdminContentStore implements AdminContentStore {
  readonly auditEvents: Array<{
    action: "NFT_DRAFT_UPDATED";
    actorWallet: `0x${string}`;
    correlationId: string;
    fromRevision: number;
    tokenId: number;
    toRevision: number;
  }> = [];
  readonly revisions: ContentRevision[] = [];
  private nextContentId = 1;

  async listCurrent(deploymentKey: string) {
    return this.revisions
      .filter(
        (candidate) =>
          candidate.deploymentKey === deploymentKey &&
          !this.revisions.some(
            (newer) =>
              newer.deploymentKey === deploymentKey &&
              newer.tokenId === candidate.tokenId &&
              newer.revision > candidate.revision,
          ),
      )
      .sort((left, right) => left.tokenId - right.tokenId)
      .map((content) => structuredClone(content));
  }

  async replaceDraft(
    input: DraftWrite,
    confirmUnminted: () => Promise<boolean>,
  ): Promise<DraftWriteResult> {
    const current = (await this.listCurrent(input.deploymentKey)).find(
      (content) => content.tokenId === input.tokenId,
    );
    if ((current?.revision ?? 0) !== input.expectedRevision)
      return { status: "conflict" };
    if (!(await confirmUnminted())) return { status: "minted-locked" };
    const revision = (current?.revision ?? 0) + 1;
    const content: ContentRevision = {
      contentId: String(this.nextContentId++),
      deploymentKey: input.deploymentKey,
      descriptionEn: input.descriptionEn,
      descriptionVi: input.descriptionVi,
      lifecycleState: "DRAFT",
      nameEn: input.nameEn,
      nameVi: input.nameVi,
      revision,
      storyEn: input.storyEn,
      storyVi: input.storyVi,
      tokenId: input.tokenId,
      updatedAt: new Date(),
    };
    this.revisions.push(content);
    this.auditEvents.push({
      action: "NFT_DRAFT_UPDATED",
      actorWallet: input.actorWallet,
      correlationId: input.correlationId,
      fromRevision: current?.revision ?? 0,
      tokenId: input.tokenId,
      toRevision: revision,
    });
    return { content: structuredClone(content), status: "updated" };
  }
}
