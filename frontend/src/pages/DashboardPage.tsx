import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Inbox, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { TableShell, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { SEED_TICKETS } from '@/data/seed';
import { formatAge, now } from '@/lib/format';
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  SLA_TARGET_MINUTES,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/types/ticket';

const AGE_BUCKETS = [
  { label: '< 4h', maxHours: 4 },
  { label: '4h – 24h', maxHours: 24 },
  { label: '1 – 3 days', maxHours: 72 },
  { label: '3 – 7 days', maxHours: 168 },
  { label: '7 days+', maxHours: Infinity },
];

export function DashboardPage() {
  const navigate = useNavigate();

  const open = useMemo(() => SEED_TICKETS.filter((t) => t.status !== 'closed'), []);

  const buckets = useMemo(() => {
    return AGE_BUCKETS.map((bucket, i) => {
      const minHours = i === 0 ? 0 : AGE_BUCKETS[i - 1].maxHours;
      const count = open.filter((t) => {
        const ageHours = (now() - new Date(t.createdAt).getTime()) / 3_600_000;
        return ageHours >= minHours && ageHours < bucket.maxHours;
      }).length;
      return { ...bucket, count };
    });
  }, [open]);

  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const breached = useMemo(() => {
    return open
      .filter((t) => !t.firstResponseAt)
      .map((t) => ({ ticket: t, targetMs: SLA_TARGET_MINUTES[t.priority].firstResponse * 60_000 }))
      .filter(({ ticket, targetMs }) => now() - new Date(ticket.createdAt).getTime() > targetMs)
      .sort((a, b) => +new Date(a.ticket.createdAt) - +new Date(b.ticket.createdAt));
  }, [open]);

  const byAgent = useMemo(() => {
    const map = new Map<string, { name: string; open: number; urgent: number }>();
    for (const t of open) {
      if (!t.assigneeId || !t.assigneeName) continue;
      const entry = map.get(t.assigneeId) ?? { name: t.assigneeName, open: 0, urgent: 0 };
      entry.open += 1;
      if (t.priority === 'urgent') entry.urgent += 1;
      map.set(t.assigneeId, entry);
    }
    return [...map.values()].sort((a, b) => b.open - a.open);
  }, [open]);

  const unassigned = open.filter((t) => !t.assigneeId).length;
  const oldestOpen = [...open].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <p className="text-sm text-muted">Open tickets across every agent, aggregated by age and SLA status.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open tickets" value={open.length} icon={<Inbox className="size-4" />} />
        <StatTile
          label="Unassigned"
          value={unassigned}
          tone={unassigned > 0 ? 'warn' : 'default'}
          icon={<UserCheck className="size-4" />}
        />
        <StatTile
          label="SLA breaches"
          value={breached.length}
          tone={breached.length > 0 ? 'danger' : 'default'}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatTile
          label="Oldest open"
          value={oldestOpen ? formatAge(oldestOpen.createdAt) : '—'}
          icon={<Clock3 className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Open tickets by age" description="Aggregate bucket counts, not a per-row scan." />
          <CardBody className="space-y-3">
            {buckets.map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{b.label}</span>
                  <span className="font-medium text-fg tabular-nums">{b.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Load by agent" description="Open ticket count currently assigned to each agent." />
          <CardBody>
            {byAgent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No tickets assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {byAgent.map((a) => (
                  <li key={a.name} className="flex items-center gap-3">
                    <Avatar name={a.name} size="sm" />
                    <span className="min-w-24 text-sm font-medium text-fg">{a.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: `${(a.open / Math.max(1, open.length)) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm tabular-nums text-fg">{a.open}</span>
                    {a.urgent > 0 && (
                      <Badge tone="danger" size="sm">
                        {a.urgent} urgent
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="SLA breaches"
          description="First-response target missed and still waiting -- computed, not manually flagged."
        />
        <CardBody>
          {breached.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="size-5" />} title="No breaches right now" description="Every open ticket is within its first-response target." />
          ) : (
            <TableShell>
              <THead>
                <TH>Ticket</TH>
                <TH>Status</TH>
                <TH>Priority</TH>
                <TH>Assignee</TH>
                <TH>Age</TH>
              </THead>
              <TBody>
                {breached.map(({ ticket: t }) => (
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
                    <TD className="text-muted">{t.assigneeName ?? 'Unassigned'}</TD>
                    <TD className="font-medium text-danger tabular-nums">{formatAge(t.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </TableShell>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
