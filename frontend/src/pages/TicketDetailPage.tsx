import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Lock, MessageSquare, Send, ShieldAlert, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select, Textarea } from '@/components/ui/Field';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { LoadingPanel } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddComment,
  useAgents,
  useAssignTicket,
  useTicket,
  useTransitionTicket,
} from '@/hooks/useTickets';
import { isApiError } from '@/lib/api-client';
import { describeError } from '@/lib/error-message';
import { formatAge, formatBusinessMinutes, formatDateTime, now } from '@/lib/format';
import {
  isAgent,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  TRANSITIONS,
  type Assignment,
  type Comment,
  type Ticket,
  type TicketStatus,
  type Transition,
} from '@/types/ticket';

type ActivityEntry = {
  id: string;
  at: string;
  icon: 'status' | 'assign' | 'comment';
  text: string;
  actor: string;
};

// Merges transitions, assignments and comments into one time-ordered feed.
function buildActivity(
  transitions: Transition[],
  assignments: Assignment[],
  comments: Comment[],
): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...transitions.map((t) => ({
      id: `transition-${t.id}`,
      at: t.changedAt,
      icon: 'status' as const,
      actor: t.changedByName,
      text: t.fromStatus
        ? `moved the ticket ${STATUS_LABEL[t.fromStatus]} → ${STATUS_LABEL[t.toStatus]}`
        : 'raised the ticket',
    })),
    ...assignments.map((a, index) => ({
      id: `assignment-${a.id}`,
      at: a.assignedAt,
      icon: 'assign' as const,
      actor: a.agentName,
      text: index === 0 ? `was assigned the ticket` : `was assigned the ticket on reassignment`,
    })),
    ...comments.map((c) => ({
      id: `comment-${c.id}`,
      at: c.createdAt,
      icon: 'comment' as const,
      actor: c.authorName,
      text: c.isInternal ? 'added an internal note' : 'added a reply',
    })),
  ];

  return entries.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

// One SLA line: server-measured minutes judged against the server-stored deadline.
function SlaRow({
  label,
  actualMinutes,
  dueAt,
  completedAt,
}: {
  label: string;
  actualMinutes: number | null;
  dueAt: string | null;
  /** When the milestone happened (responded / resolved), or null if pending. */
  completedAt: string | null;
}) {
  const overdue = completedAt === null && dueAt !== null && new Date(dueAt).getTime() < now();
  const met =
    completedAt !== null && dueAt !== null
      ? new Date(completedAt).getTime() <= new Date(dueAt).getTime()
      : null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className={overdue ? 'font-medium text-danger' : 'text-fg'}>
          {actualMinutes !== null ? formatBusinessMinutes(actualMinutes) : 'Pending'}
        </span>
        {completedAt !== null ? (
          <Badge tone={met === false ? 'danger' : 'ok'} size="sm">
            {met === false ? 'Missed' : 'Met'}
          </Badge>
        ) : (
          <Badge tone={overdue ? 'danger' : 'neutral'} size="sm">
            {overdue ? 'Breached' : dueAt ? `Due ${formatDateTime(dueAt)}` : 'No target'}
          </Badge>
        )}
      </span>
    </div>
  );
}

function WorkflowCard({ ticket }: { ticket: Ticket }) {
  const transition = useTransitionTicket(ticket.id);
  const assign = useAssignTicket(ticket.id);
  const { data: agents, isPending: agentsPending } = useAgents();

  const legalNext = TRANSITIONS[ticket.status] ?? [];
  const rejection = isApiError(transition.error) ? transition.error : null;

  return (
    <Card>
      <CardHeader
        title="Workflow"
        description="Only transitions defined for this state are offered."
      />
      <CardBody className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Assignee</p>
          <Select
            value={ticket.assigneeId ?? ''}
            placeholder={agentsPending ? 'Loading agents…' : 'Unassigned'}
            disabled={assign.isPending || agentsPending}
            onChange={(e) => {
              if (e.target.value) assign.mutate(e.target.value);
            }}
            options={(agents ?? []).map((agent) => ({ value: agent.id, label: agent.name }))}
          />
          <p className="mt-1.5 text-xs text-subtle">
            Assigning a new or reopened ticket also moves it to Assigned, server-side.
          </p>
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
                  isLoading={transition.isPending && transition.variables === next}
                  disabled={transition.isPending}
                  onClick={() => transition.mutate(next as TicketStatus)}
                >
                  {STATUS_LABEL[next]}
                </Button>
              ))}
            </div>
          )}
        </div>

        {rejection && (
          <Alert tone="danger" title="Transition rejected by the server">
            {describeError(rejection)}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isPending, isError, error } = useTicket(id);
  const addComment = useAddComment(id ?? '');

  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const activity = useMemo(
    () => (data ? buildActivity(data.transitions, data.assignments, data.comments) : []),
    [data],
  );

  if (isPending) return <LoadingPanel label="Loading ticket" />;

  if (isError) {
    // Another requester's ticket id gets the same 404 as a nonexistent one.
    const notFound = isApiError(error) && error.status === 404;
    return notFound ? (
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
    ) : (
      <Alert tone="danger" title="Could not load this ticket">
        {describeError(error)}
      </Alert>
    );
  }

  const { ticket, comments } = data;
  const isStaff = isAgent(user?.role);

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const body = reply.trim();
    if (!body) return;

    addComment.mutate(
      { body, isInternal: isStaff && isInternal },
      {
        onSuccess: () => {
          setReply('');
          setIsInternal(false);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <LinkButton
        to="/tickets"
        variant="ghost"
        size="sm"
        leadingIcon={<ArrowLeft className="size-4" />}
      >
        Back
      </LinkButton>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2 text-base">
                  {ticket.subject}
                  <span className="font-mono text-xs font-normal text-subtle">
                    {ticket.id.slice(-8)}
                  </span>
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
              <p className="text-sm leading-relaxed whitespace-pre-line text-fg">
                {ticket.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  {CATEGORY_LABEL[ticket.category]}
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  Open {formatAge(ticket.createdAt)}
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  {ticket.assigneeName ? `Assigned to ${ticket.assigneeName}` : 'Unassigned'}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Comments"
              description={
                isStaff
                  ? 'Internal notes are never returned to the requester by any endpoint.'
                  : 'Replies from the support team.'
              }
            />
            <CardBody className="space-y-4">
              {comments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No comments yet.</p>
              ) : (
                <ul className="space-y-4">
                  {comments.map((c) => (
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
                        <p className="text-sm whitespace-pre-line text-fg">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={submitReply} className="space-y-3 border-t border-line pt-4">
                <Textarea
                  placeholder={
                    isInternal
                      ? 'Write an internal note (agents only)'
                      : 'Write a reply the requester will see'
                  }
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  {isStaff ? (
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="size-4 rounded border-line-strong text-brand focus:ring-brand/25"
                      />
                      Internal note
                    </label>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    trailingIcon={<Send className="size-3.5" />}
                    isLoading={addComment.isPending}
                    disabled={!reply.trim()}
                  >
                    {isInternal ? 'Add note' : 'Reply'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Status and assignment are agent-only on the server too. */}
          {isStaff && <WorkflowCard ticket={ticket} />}

          <Card>
            <CardHeader
              title="Response & resolution"
              description="Measured in business hours against the target for this priority."
            />
            <CardBody className="space-y-3">
              <SlaRow
                label="First response"
                actualMinutes={ticket.firstResponseMinutes}
                dueAt={ticket.firstResponseDueAt}
                completedAt={ticket.firstRespondedAt}
              />
              <SlaRow
                label="Resolution"
                actualMinutes={ticket.resolutionMinutes}
                dueAt={ticket.resolutionDueAt}
                completedAt={ticket.resolvedAt}
              />
              <p className="pt-1 text-xs text-subtle">
                Deadlines were computed when the ticket was raised, skipping time outside business
                hours -- a ticket raised on Friday evening is not late by Monday morning.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Structured trace of every change." />
            <CardBody className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 text-subtle">
                        {entry.icon === 'comment' ? (
                          <MessageSquare className="size-3.5" />
                        ) : entry.icon === 'status' ? (
                          <Clock className="size-3.5" />
                        ) : (
                          <UserRound className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-fg">
                          <span className="font-medium">{entry.actor}</span> {entry.text}
                        </p>
                        <p className="text-xs text-subtle">{formatDateTime(entry.at)}</p>
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
