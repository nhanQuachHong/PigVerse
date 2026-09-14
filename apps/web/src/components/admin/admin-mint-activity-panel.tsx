"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import {
  adminMintActivityQueryKey,
  fetchAdminMintActivity,
  type AdminMintActivity,
  type AdminMintActivityPage,
} from "../../lib/admin-mint-activity";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";

function shortHash(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function statusKey(status: AdminMintActivity["status"]) {
  if (status === "SUCCEEDED") return "admin.activitySucceeded" as const;
  if (status === "REVERTED") return "admin.activityReverted" as const;
  if (status === "PENDING") return "admin.activityPending" as const;
  return "admin.activityUnknown" as const;
}

export function AdminMintActivityPanel() {
  const { locale, t } = useLocale();
  const activity = useInfiniteQuery<
    AdminMintActivityPage,
    Error,
    InfiniteData<AdminMintActivityPage>,
    typeof adminMintActivityQueryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchAdminMintActivity(pageParam),
    queryKey: adminMintActivityQueryKey,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 10_000,
  });
  const rows = activity.data?.pages.flatMap((page) => page.activities) ?? [];
  const formatter = new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <section
      aria-labelledby="admin-mint-activity-title"
      className="pv-admin-activity"
    >
      <div className="pv-admin-content__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.activityEyebrow")}</p>
          <h2 id="admin-mint-activity-title">{t("admin.activityTitle")}</h2>
        </div>
        <Button
          disabled={activity.isFetching}
          onClick={() => void activity.refetch()}
          size="sm"
          variant="ghost"
        >
          <Icon name="refresh" size={17} /> {t("admin.activityRefresh")}
        </Button>
      </div>
      <p className="pv-admin-activity__description">
        {t("admin.activityDescription")}
      </p>
      {activity.isPending ? (
        <Card aria-busy="true" className="pv-admin-audit__state">
          <span className="pv-skeleton pv-skeleton--title" />
          <span className="pv-skeleton pv-skeleton--text" />
        </Card>
      ) : activity.isError ? (
        <Card className="pv-admin-audit__state" role="alert">
          <Icon name="alert" size={20} />
          <p>{t("admin.activityUnavailable")}</p>
          <Button
            onClick={() => void activity.refetch()}
            size="sm"
            variant="secondary"
          >
            {t("common.retry")}
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="pv-admin-audit__state">
          <p>{t("admin.activityEmpty")}</p>
        </Card>
      ) : (
        <>
          <ol className="pv-admin-activity__list">
            {rows.map((row) => (
              <li key={row.mintObservationId}>
                <Card className="pv-admin-activity__row">
                  <span
                    className={`pv-admin-activity__status pv-admin-activity__status--${row.status.toLowerCase()}`}
                  >
                    {t(statusKey(row.status))}
                  </span>
                  <div className="pv-admin-activity__identity">
                    <strong>Token #{row.tokenId}</strong>
                    <code title={row.senderWallet}>
                      {shortHash(row.senderWallet)}
                    </code>
                  </div>
                  <div className="pv-admin-activity__evidence">
                    <a
                      href={`https://sepolia.basescan.org/tx/${row.transactionHash}`}
                      rel="noreferrer"
                      target="_blank"
                      title={row.transactionHash}
                    >
                      {shortHash(row.transactionHash)}
                    </a>
                    <span>
                      {row.blockNumber
                        ? `${t("admin.activityBlock")} ${row.blockNumber}`
                        : t("admin.activityNoBlock")}
                    </span>
                  </div>
                  <div className="pv-admin-activity__time">
                    <time dateTime={row.lastObservedAt}>
                      {formatter.format(new Date(row.lastObservedAt))}
                    </time>
                    {row.reconciliation !== "current" && (
                      <span className="pv-admin-activity__warning">
                        {t("admin.activityReconciliationUnavailable")}
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
          {activity.hasNextPage && (
            <Button
              disabled={activity.isFetchingNextPage}
              onClick={() => void activity.fetchNextPage()}
              size="sm"
              variant="secondary"
            >
              {activity.isFetchingNextPage
                ? t("admin.activityLoadingMore")
                : t("admin.activityLoadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
