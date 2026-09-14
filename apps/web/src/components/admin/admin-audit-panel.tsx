"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import {
  adminAuditQueryKey,
  fetchAdminAudit,
  type AdminAuditEvent,
  type AdminAuditPage,
} from "../../lib/admin-audit";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function revisionSummary(event: AdminAuditEvent) {
  const fromRevision = event.safeContext.fromRevision;
  const toRevision = event.safeContext.toRevision;
  return Number.isInteger(fromRevision) && Number.isInteger(toRevision)
    ? `${fromRevision} → ${toRevision}`
    : null;
}

export function AdminAuditPanel() {
  const { locale, t } = useLocale();
  const audit = useInfiniteQuery<
    AdminAuditPage,
    Error,
    InfiniteData<AdminAuditPage>,
    typeof adminAuditQueryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchAdminAudit(pageParam),
    queryKey: adminAuditQueryKey,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 10_000,
  });
  const events = audit.data?.pages.flatMap((page) => page.events) ?? [];
  const formatter = new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
  const actionLabel = (action: string) => {
    if (action === "NFT_DRAFT_UPDATED") return t("admin.auditActionDraft");
    if (action === "NFT_PUBLISHED") return t("admin.auditActionPublished");
    if (action === "NFT_UNPUBLISHED") return t("admin.auditActionUnpublished");
    return t("admin.auditActionOther");
  };

  return (
    <section aria-labelledby="admin-audit-title" className="pv-admin-audit">
      <div className="pv-admin-content__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.auditEyebrow")}</p>
          <h2 id="admin-audit-title">{t("admin.auditTitle")}</h2>
        </div>
        <Button
          disabled={audit.isFetching}
          onClick={() => void audit.refetch()}
          size="sm"
          variant="ghost"
        >
          <Icon name="refresh" size={17} /> {t("admin.auditRefresh")}
        </Button>
      </div>
      {audit.isPending ? (
        <Card aria-busy="true" className="pv-admin-audit__state">
          <span className="pv-skeleton pv-skeleton--title" />
          <span className="pv-skeleton pv-skeleton--text" />
        </Card>
      ) : audit.isError ? (
        <Card className="pv-admin-audit__state" role="alert">
          <Icon name="alert" size={20} />
          <p>{t("admin.auditUnavailable")}</p>
          <Button
            onClick={() => void audit.refetch()}
            size="sm"
            variant="secondary"
          >
            {t("common.retry")}
          </Button>
        </Card>
      ) : events.length === 0 ? (
        <Card className="pv-admin-audit__state">
          <p>{t("admin.auditEmpty")}</p>
        </Card>
      ) : (
        <>
          <ol className="pv-admin-audit__list">
            {events.map((event) => {
              const revisions = revisionSummary(event);
              return (
                <li key={event.auditEventId}>
                  <Card className="pv-admin-audit__event">
                    <span className="pv-admin-audit__icon" aria-hidden="true">
                      <Icon name="check" size={18} />
                    </span>
                    <div>
                      <strong>{actionLabel(event.action)}</strong>
                      <p>
                        {event.target.tokenId === null
                          ? event.target.type
                          : `Token #${event.target.tokenId}`}
                        {revisions
                          ? ` · ${t("admin.auditRevision")} ${revisions}`
                          : ""}
                      </p>
                    </div>
                    <div className="pv-admin-audit__meta">
                      <code title={event.actorWallet}>
                        {shortWallet(event.actorWallet)}
                      </code>
                      <time dateTime={event.createdAt}>
                        {formatter.format(new Date(event.createdAt))}
                      </time>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
          {audit.hasNextPage && (
            <Button
              disabled={audit.isFetchingNextPage}
              onClick={() => void audit.fetchNextPage()}
              size="sm"
              variant="secondary"
            >
              {audit.isFetchingNextPage
                ? t("admin.auditLoadingMore")
                : t("admin.auditLoadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
