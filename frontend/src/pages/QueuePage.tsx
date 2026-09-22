import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/ui/Card';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { LoadingPanel } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { useTicketList } from '@/hooks/useTickets';
import { describeError } from '@/lib/error-message';
import { formatAge } from '@/lib/format';
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/types/ticket';

const PAGE_SIZE = 10;

export function QueuePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // scope=queue is resolved server-side against the open assignment row.
  const { data, isPending, isError, error } = useTicketList({
    scope: 'queue',
    page,
    pageSize: PAGE_SIZE,
  });

  // Scoped count covering the whole queue, not just the current page.
  const { data: urgent } = useTicketList({ scope: 'queue', priority: 'urgent', pageSize: 1 });

  const tickets = data?.items ?? [];
  // Rows come back oldest-first, so the first row of page 1 is the oldest.
  const oldest = page === 1 ? tickets[0] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">My queue</h1>
        <p className="text-sm text-muted">
          Tickets currently assigned to you, not a filtered view of everything.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Assigned to me" value={data?.total ?? '—'} />
        <StatTile
          label="Urgent"
          value={urgent?.total ?? '—'}
          tone={(urgent?.total ?? 0) > 0 ? 'danger' : 'default'}
        />
        <StatTile label="Oldest in queue" value={oldest ? formatAge(oldest.createdAt) : '—'} />
      </div>

      {isError ? (
        <Alert tone="danger" title="Could not load your queue">
          {describeError(error)}
        </Alert>
      ) : isPending ? (
        <LoadingPanel label="Loading your queue" />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="Your queue is empty"
          description="Nothing is currently assigned to you."
        />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>Ticket</TH>
              <TH>Status</TH>
              <TH>Priority</TH>
              <TH>Category</TH>
              <TH>Requester</TH>
              <TH>Age</TH>
            </THead>
            <TBody>
              {tickets.map((t) => (
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
                    <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                  </TD>
                  <TD className="text-muted">{CATEGORY_LABEL[t.category]}</TD>
                  <TD className="text-muted">{t.requesterName}</TD>
                  <TD className="text-muted tabular-nums">{formatAge(t.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </TableShell>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
