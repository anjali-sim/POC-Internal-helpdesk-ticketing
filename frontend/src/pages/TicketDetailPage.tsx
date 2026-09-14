import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Lock, MessageSquare, Send, ShieldAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/Feedback';
import { Avatar } from '@/components/ui/Avatar';
import { formatAge, formatDateTime, formatDuration, now } from '@/lib/format';
import { AGENTS, SEED_AUDIT, SEED_COMMENTS, SEED_TICKETS } from '@/data/seed';
import {
  isLegalTransition,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  SLA_TARGET_MINUTES,
  STATUS_LABEL,
  STATUS_TONE,
  TRANSITIONS,
  type AuditEvent,
  type Comment,
  type Ticket,
  type TicketStatus,
} from '@/types/ticket';

const CURRENT_USER = AGENTS[0];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function slaRow(label: string, actual: string | null, targetMinutes: number, createdAt: string) {
  const targetMs = targetMinutes * 60_000;
  const elapsedMs = actual ? new Date(actual).getTime() - new Date(createdAt).getTime() : now() - new Date(createdAt).getTime();
  const met = actual ? elapsedMs <= targetMs : null;
  const overdue = !actual && elapsedMs > targetMs;

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className={overdue ? 'font-medium text-danger' : 'text-fg'}>
          {actual ? formatDuration(elapsedMs) : `${formatDuration(elapsedMs)} elapsed`}
        </span>
        <Badge tone={met === null ? (overdue ? 'danger' : 'neutral') : met ? 'ok' : 'danger'} size="sm">
          {met === null ? (overdue ? 'Breached' : `Target ${formatDuration(targetMs)}`) : met ? 'Met' : 'Missed'}
        </Badge>
      </span>
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
  const [audit, setAudit] = useState<AuditEvent[]>(SEED_AUDIT);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const ticket = tickets.find((t) => t.id === id);

  const visibleComments = useMemo(() => comments.filter((c) => c.ticketId === id), [comments, id]);
  const ticketAudit = useMemo(() => audit.filter((a) => a.ticketId === id), [audit, id]);

  if (!ticket) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="Ticket not found"
        description="It may not exist, or it may belong to another requester."
        action={
          <LinkButton to="/tickets" size="sm">
            Back to tickets
          </LinkButton>
        }
      />
    );
  }

  const legalNext = TRANSITIONS[ticket.status] ?? [];
  const sla = SLA_TARGET_MINUTES[ticket.priority];

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !ticket) return;
    const now = new Date().toISOString();
    const comment: Comment = {
      id: nextId('c'),
      ticketId: ticket.id,
      authorId: CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      authorRole: CURRENT_USER.role,
      body: reply.trim(),
      isInternal,
      createdAt: now,
    };
    setComments((prev) => [...prev, comment]);
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, updatedAt: now } : t)));
    setAudit((prev) => [
      {
        id: nextId('a'),
        ticketId: ticket.id,
        type: 'comment_added',
        fromValue: null,
        toValue: isInternal ? 'internal note' : 'reply',
        actorId: CURRENT_USER.id,
        actorName: CURRENT_USER.name,
        createdAt: now,
      },
      ...prev,
    ]);
    setReply('');
    setIsInternal(false);
  }

  function assign(agentId: string) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent || !ticket) return;
    const now = new Date().toISOString();
    const previous = ticket.assigneeName;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? { ...t, assigneeId: agent.id, assigneeName: agent.name, status: t.status === 'new' ? 'assigned' : t.status, updatedAt: now }
          : t,
      ),
    );
    setAudit((prev) => [
      {
        id: nextId('a'),
        ticketId: ticket.id,
        type: previous ? 'reassigned' : 'assigned',
        fromValue: previous,
        toValue: agent.name,
        actorId: CURRENT_USER.id,
        actorName: CURRENT_USER.name,
        createdAt: now,
      },
      ...prev,
    ]);
    toast.success(previous ? `Reassigned to ${agent.name}` : `Assigned to ${agent.name}`);
  }

  function transition(to: TicketStatus) {
    if (!ticket || !isLegalTransition(ticket.status, to)) return;
    const now = new Date().toISOString();
    const from = ticket.status;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              status: to,
              updatedAt: now,
              resolvedAt: to === 'resolved' ? now : to === 'reopened' ? null : t.resolvedAt,
              closedAt: to === 'closed' ? now : to === 'reopened' ? null : t.closedAt,
            }
          : t,
      ),
    );
    setAudit((prev) => [
      { id: nextId('a'), ticketId: ticket.id, type: 'status_changed', fromValue: from, toValue: to, actorId: CURRENT_USER.id, actorName: CURRENT_USER.name, createdAt: now },
      ...prev,
    ]);
    toast.success(`Ticket moved to ${to.replace('_', ' ')}`);
  }

  return (
    <div className="space-y-6">
      <LinkButton to="/tickets" variant="ghost" size="sm" leadingIcon={<ArrowLeft className="size-4" />}>
        Back
      </LinkButton>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2 text-base">
                  {ticket.subject}
                  <span className="font-mono text-xs font-normal text-subtle">{ticket.id}</span>
                </span>
              }
              description={`Opened ${formatDateTime(ticket.createdAt)} by ${ticket.requesterName}`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[ticket.status]} dot size="md">
                    {STATUS_LABEL[ticket.status]}
                  </Badge>
                  <Badge tone={PRIORITY_TONE[ticket.priority]} size="md">
                    {PRIORITY_LABEL[ticket.priority]}
                  </Badge>
                </div>
              }
            />
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-fg whitespace-pre-line">{ticket.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-surface-2 px-2.5 py-1">{CATEGORY_LABEL[ticket.category]}</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1">Open {formatAge(ticket.createdAt)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Comments"
              description="Internal notes are never shown to the requester."
            />
            <CardBody className="space-y-4">
              {visibleComments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No comments yet.</p>
              ) : (
                <ul className="space-y-4">
                  {visibleComments.map((c) => (
                    <li
                      key={c.id}
                      className={`flex gap-3 rounded-lg border p-3 ${
                        c.isInternal ? 'border-warn/25 bg-warn-soft' : 'border-line bg-surface-2/60'
                      }`}
                    >
                      <Avatar name={c.authorName} size="sm" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-fg">{c.authorName}</span>
                          <span className="text-xs text-subtle">{formatDateTime(c.createdAt)}</span>
                          {c.isInternal && (
                            <Badge tone="warn" size="sm">
                              <Lock className="size-3" /> Internal note
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-fg whitespace-pre-line">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={submitReply} className="space-y-3 border-t border-line pt-4">
                <Textarea
                  placeholder={isInternal ? 'Write an internal note (agents only)' : 'Write a reply the requester will see'}
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="size-4 rounded border-line-strong text-brand focus:ring-brand/25"
                    />
                    Internal note
                  </label>
                  <Button type="submit" size="sm" trailingIcon={<Send className="size-3.5" />} disabled={!reply.trim()}>
                    {isInternal ? 'Add note' : 'Reply'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Workflow" description="Only transitions defined for this state are offered." />
            <CardBody className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Assignee</p>
                <Select
                  value={ticket.assigneeId ?? ''}
                  placeholder="Unassigned"
                  onChange={(e) => assign(e.target.value)}
                  options={AGENTS.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Move to</p>
                {legalNext.length === 0 ? (
                  <p className="text-sm text-muted">No further transitions from this state.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {legalNext.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === 'reopened' ? 'danger' : 'secondary'}
                        onClick={() => transition(next as TicketStatus)}
                      >
                        {STATUS_LABEL[next]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Response & resolution" />
            <CardBody className="space-y-3">
              {slaRow('First response', ticket.firstResponseAt, sla.firstResponse, ticket.createdAt)}
              {slaRow('Resolution', ticket.resolvedAt, sla.resolution, ticket.createdAt)}
              <p className="pt-1 text-xs text-subtle">
                Targets apply to elapsed calendar time in this preview; the API tracks business hours separately.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Structured trace of every change." />
            <CardBody className="space-y-3">
              {ticketAudit.length === 0 ? (
                <p className="text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {ticketAudit.map((a) => (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 text-subtle">
                        {a.type === 'comment_added' ? <MessageSquare className="size-3.5" /> : a.type === 'status_changed' ? <Clock className="size-3.5" /> : <UserRound className="size-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-fg">
                          <span className="font-medium">{a.actorName}</span>{' '}
                          {a.type === 'created' && 'raised the ticket'}
                          {a.type === 'assigned' && `assigned to ${a.toValue}`}
                          {a.type === 'reassigned' && `reassigned ${a.fromValue} → ${a.toValue}`}
                          {a.type === 'status_changed' && `changed status ${a.fromValue} → ${a.toValue}`}
                          {a.type === 'comment_added' && `added a ${a.toValue}`}
                        </p>
                        <p className="text-xs text-subtle">{formatDateTime(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
