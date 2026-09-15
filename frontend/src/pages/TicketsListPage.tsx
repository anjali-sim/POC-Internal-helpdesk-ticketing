import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { SEED_TICKETS } from '@/data/seed';
import { formatAge } from '@/lib/format';
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type Priority,
  type TicketStatus,
} from '@/types/ticket';

const PAGE_SIZE = 8;

export function TicketsListPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return SEED_TICKETS.filter((t) => (status ? t.status === status : true))
      .filter((t) => (priority ? t.priority === priority : true))
      .filter((t) => (search ? `${t.id} ${t.subject}`.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }, [status, priority, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">All tickets</h1>
          <p className="text-sm text-muted">Full board across every requester and agent.</p>
        </div>
        <LinkButton to="/tickets/new" leadingIcon={<Plus className="size-4" />}>
          New ticket
        </LinkButton>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search subject or ID"
            className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
          />
        </div>
        <Select
          className="w-44"
          placeholder="All statuses"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TicketStatus | '');
            setPage(1);
          }}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          className="w-40"
          placeholder="All priorities"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as Priority | '');
            setPage(1);
          }}
          options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<TicketIcon className="size-5" />}
          title="No tickets match"
          description="Try clearing filters or raise a new ticket."
          action={
            <LinkButton to="/tickets/new" size="sm" leadingIcon={<Plus className="size-4" />}>
              New ticket
            </LinkButton>
          }
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
              <TH>Assignee</TH>
              <TH>Age</TH>
            </THead>
            <TBody>
              {paged.map((t) => (
                <TR key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                  <TD className="max-w-72">
                    <p className="truncate font-medium text-fg">{t.subject}</p>
                    <p className="text-xs text-subtle">{t.id}</p>
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
