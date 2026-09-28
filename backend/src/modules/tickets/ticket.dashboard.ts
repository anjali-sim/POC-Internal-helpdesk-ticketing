import { Prisma, Role } from '@prisma/client';

import { ForbiddenError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { AuthUser } from './ticket.service';

const AGE_BUCKETS = ['lt_24h', '1_3d', '3_7d', 'gt_7d'] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

interface AgeBucketRow {
  bucket: AgeBucket;
  count: number;
  breached: number;
  oldestCreatedAt: Date;
}

interface SlaSummaryRow {
  openTotal: number;
  unassigned: number;
  firstResponseBreached: number;
  resolutionBreached: number;
}

/**
 * Open tickets grouped by age, plus SLA breach counts.
 *
 * Both are aggregates executed in Postgres — no ticket rows cross the wire and
 * no age is computed in JS, so the cost stays flat as ticket volume grows. The
 * scans are served by the (status, createdAt) and (status, resolutionDueAt)
 * indexes on Ticket.
 */
export async function getDashboard(user: AuthUser) {
  if (user.role === Role.REQUESTER) {
    throw new ForbiddenError('Requesters do not have a dashboard');
  }

  // Whole helpdesk for every agent, matching visibilityWhere.
  const openScope = Prisma.sql`t."status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')`;

  const [buckets, summary] = await Promise.all([
    prisma.$queryRaw<AgeBucketRow[]>`
      SELECT
        CASE
          WHEN t."createdAt" > now() - interval '24 hours' THEN 'lt_24h'
          WHEN t."createdAt" > now() - interval '72 hours' THEN '1_3d'
          WHEN t."createdAt" > now() - interval '7 days'   THEN '3_7d'
          ELSE 'gt_7d'
        END AS bucket,
        count(*)::int AS count,
        count(*) FILTER (
          WHERE t."resolutionDueAt" IS NOT NULL AND now() > t."resolutionDueAt"
        )::int AS breached,
        min(t."createdAt") AS "oldestCreatedAt"
      FROM "Ticket" t
      WHERE ${openScope}
      GROUP BY 1
    `,
    prisma.$queryRaw<SlaSummaryRow[]>`
      SELECT
        count(*)::int AS "openTotal",
        count(*) FILTER (WHERE t."status" = 'NEW')::int AS "unassigned",
        count(*) FILTER (
          WHERE t."firstRespondedAt" IS NULL
            AND t."firstResponseDueAt" IS NOT NULL
            AND now() > t."firstResponseDueAt"
        )::int AS "firstResponseBreached",
        count(*) FILTER (
          WHERE t."resolutionDueAt" IS NOT NULL AND now() > t."resolutionDueAt"
        )::int AS "resolutionBreached"
      FROM "Ticket" t
      WHERE ${openScope}
    `,
  ]);

  const byBucket = new Map(buckets.map((row) => [row.bucket, row]));

  return {
    // Fixed bucket order, with empty buckets present so the UI table is stable.
    ageBuckets: AGE_BUCKETS.map((bucket) => ({
      bucket,
      count: byBucket.get(bucket)?.count ?? 0,
      breached: byBucket.get(bucket)?.breached ?? 0,
      oldestCreatedAt: byBucket.get(bucket)?.oldestCreatedAt ?? null,
    })),
    sla: summary[0] ?? {
      openTotal: 0,
      unassigned: 0,
      firstResponseBreached: 0,
      resolutionBreached: 0,
    },
  };
}
