import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { LoadingPanel } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTicketList } from '@/hooks/useTickets';
import { describeError } from '@/lib/error-message';
import { formatAge } from '@/lib/format';
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type Category,
  type Priority,
  type TicketStatus,
} from '@/types/ticket';

const PAGE_SIZE = 10;

export function TicketsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [page, setPage] = useState(1);

  // Filters and paging are query-key inputs, so each change refetches one page.
  const { data, isPending, isError, error, isFetching } = useTicketList({
    status: status || undefined,
    priority: priority || undefined,
    category: category || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const isRequester = user?.role === 'REQUESTER';
  const tickets = data?.items ?? [];

  // Any filter change resets the page number.
  function applyFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            {isRequester ? 'My tickets' : 'All tickets'}
          </h1>
          <p className="text-sm text-muted">
            {isRequester
              ? 'Tickets you have raised. The server scopes this to you -- nobody else’s tickets are reachable.'
              : 'Unclaimed tickets plus everything assigned to you.'}
          </p>
        </div>
        {isRequester && (
          <LinkButton to="/tickets/new" leadingIcon={<Plus className="size-4" />}>
            New ticket
          </LinkButton>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          className="w-44"
          placeholder="All statuses"
          value={status}
          onChange={(e) => applyFilter(setStatus, e.target.value as TicketStatus | '')}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          className="w-40"
          placeholder="All priorities"
          value={priority}
          onChange={(e) => applyFilter(setPriority, e.target.value as Priority | '')}
          options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          className="w-44"
          placeholder="All categories"
          value={category}
          onChange={(e) => applyFilter(setCategory, e.target.value as Category | '')}
          options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {isError ? (
        <Alert tone="danger" title="Could not load tickets">
          {describeError(error)}
        </Alert>
      ) : isPending ? (
        <LoadingPanel label="Loading tickets" />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<TicketIcon className="size-5" />}
          title="No tickets match"
          description="Try clearing filters or raise a new ticket."
          action={
            isRequester ? (
              <LinkButton to="/tickets/new" size="sm" leadingIcon={<Plus className="size-4" />}>
                New ticket
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <TableShell>
              <THead>
                <TH>Ticket</TH>
                <TH>Status</TH>
                <TH>Priority</TH>
                <TH>Category</TH>
                <TH>Requester</TH>
                <TH>Assignee</TH>
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
                    <TD>
                      {t.assigneeName ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={t.assigneeName} size="sm" />
                          <span className="text-fg">{t.assigneeName}</span>
                        </span>
                      ) : (
                        <span className="text-subtle">Unassigned</span>
                      )}
                    </TD>
                    <TD className="text-muted tabular-nums">{formatAge(t.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </TableShell>
          </div>
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
