import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { AGENTS, SEED_TICKETS } from '@/data/seed';
import { formatAge } from '@/lib/format';
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/types/ticket';

const CURRENT_AGENT = AGENTS[0];

export function QueuePage() {
  const navigate = useNavigate();

  const mine = useMemo(
    () =>
      SEED_TICKETS.filter((t) => t.assigneeId === CURRENT_AGENT.id).sort(
        (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      ),
    [],
  );

  const openCount = mine.filter((t) => t.status !== 'closed').length;
  const urgentCount = mine.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length;
  const oldest = mine[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">My queue</h1>
        <p className="text-sm text-muted">Tickets currently assigned to you, not a filtered view of everything.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Assigned to me" value={mine.length} />
        <StatTile label="Open" value={openCount} tone={openCount > 0 ? 'warn' : 'default'} />
        <StatTile
          label="Urgent"
          value={urgentCount}
          tone={urgentCount > 0 ? 'danger' : 'default'}
          hint={oldest ? `Oldest: ${formatAge(oldest.createdAt)}` : undefined}
        />
      </div>

      {mine.length === 0 ? (
        <EmptyState icon={<Inbox className="size-5" />} title="Your queue is empty" description="Nothing is currently assigned to you." />
      ) : (
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
            {mine.map((t) => (
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
                <TD className="text-muted tabular-nums">{formatAge(t.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </TableShell>
      )}
    </div>
  );
}
