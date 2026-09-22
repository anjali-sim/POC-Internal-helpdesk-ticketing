import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Inbox, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/Card';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { LoadingPanel } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { useDashboard, useTicketList } from '@/hooks/useTickets';
import { describeError } from '@/lib/error-message';
import { formatAge, now } from '@/lib/format';
import {
  AGE_BUCKET_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/types/ticket';

const PAGE_SIZE = 8;

export function DashboardPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // Buckets and SLA counts are computed server-side; this just renders the aggregate.
  const { data, isPending, isError, error } = useDashboard();

  // The oldest open tickets, ordered and paged server-side (createdAt asc).
  const oldestOpen = useTicketList({ scope: 'open', page, pageSize: PAGE_SIZE });

  if (isError) {
    return (
      <Alert tone="danger" title="Could not load the dashboard">
        {describeError(error)}
      </Alert>
    );
  }

  if (isPending) return <LoadingPanel label="Loading dashboard" />;

  const { ageBuckets, sla } = data;
  const maxBucket = Math.max(1, ...ageBuckets.map((b) => b.count));
  const oldestOverall = ageBuckets
    .map((b) => b.oldestCreatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <p className="text-sm text-muted">
          Open tickets aggregated by age and SLA status, computed in the database.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open tickets" value={sla.openTotal} icon={<Inbox className="size-4" />} />
        <StatTile
          label="Unassigned"
          value={sla.unassigned}
          tone={sla.unassigned > 0 ? 'warn' : 'default'}
          icon={<UserCheck className="size-4" />}
        />
        <StatTile
          label="Response breached"
          value={sla.firstResponseBreached}
          tone={sla.firstResponseBreached > 0 ? 'danger' : 'default'}
          icon={<AlertTriangle className="size-4" />}
          hint="Past first-response target, still unanswered"
        />
        <StatTile
          label="Resolution breached"
          value={sla.resolutionBreached}
          tone={sla.resolutionBreached > 0 ? 'danger' : 'default'}
          icon={<Clock3 className="size-4" />}
          hint={oldestOverall ? `Oldest open: ${formatAge(oldestOverall)}` : undefined}
        />
      </div>

      <Card>
        <CardHeader
          title="Open tickets by age"
          description="One GROUP BY over the (status, createdAt) index -- no ticket rows leave the database."
        />
        <CardBody className="space-y-3">
          {ageBuckets.map((bucket) => (
            <div key={bucket.bucket} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{AGE_BUCKET_LABEL[bucket.bucket]}</span>
                <span className="flex items-center gap-2">
                  {bucket.breached > 0 && (
                    <Badge tone="danger" size="sm">
                      {bucket.breached} breached
                    </Badge>
                  )}
                  <span className="font-medium text-fg tabular-nums">{bucket.count}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Oldest open tickets"
          description="Ordered and paged in SQL -- the longest-waiting tickets first."
        />
        <CardBody className="space-y-4">
          {oldestOpen.isError ? (
            <Alert tone="danger">{describeError(oldestOpen.error)}</Alert>
          ) : oldestOpen.isPending ? (
            <LoadingPanel label="Loading tickets" />
          ) : oldestOpen.data.items.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="size-5" />}
              title="Nothing open"
              description="Every ticket in scope has been resolved or closed."
            />
          ) : (
            <>
              <TableShell>
                <THead>
                  <TH>Ticket</TH>
                  <TH>Status</TH>
                  <TH>Priority</TH>
                  <TH>Assignee</TH>
                  <TH>Age</TH>
                </THead>
                <TBody>
                  {oldestOpen.data.items.map((t) => {
                    const breached = Boolean(
                      t.resolutionDueAt && new Date(t.resolutionDueAt).getTime() < now(),
                    );
                    return (
                      <TR key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                        <TD className="max-w-72">
                          <p className="truncate font-medium text-fg">{t.subject}</p>
                          <p className="font-mono text-xs text-subtle">{t.id.slice(-8)}</p>
                        </TD>
                        <TD>
                          <Badge tone={STATUS_TONE[t.status]} dot>
                            {STATUS_LABEL[t.status]}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge tone={PRIORITY_TONE[t.priority]}>
                            {PRIORITY_LABEL[t.priority]}
                          </Badge>
                        </TD>
                        <TD className="text-muted">{t.assigneeName ?? 'Unassigned'}</TD>
                        <TD
                          className={
                            breached
                              ? 'font-medium text-danger tabular-nums'
                              : 'text-muted tabular-nums'
                          }
                        >
                          {formatAge(t.createdAt)}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </TableShell>
              <Pagination
                page={oldestOpen.data.page}
                pageSize={oldestOpen.data.pageSize}
                total={oldestOpen.data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
