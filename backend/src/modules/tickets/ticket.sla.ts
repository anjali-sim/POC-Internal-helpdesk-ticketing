import { addBusinessMinutes, businessMinutesBetween } from '../../lib/business-hours';
import type { WirePriority } from './ticket.state-machine';

/**
 * Response and resolution targets per priority, in *business* minutes.
 * One table, consulted wherever a due date is produced — the same reasoning as
 * the transition table in ticket.state-machine.ts.
 */
export const SLA_TARGET_MINUTES: Record<WirePriority, { firstResponse: number; resolution: number }> = {
  urgent: { firstResponse: 30, resolution: 4 * 60 },
  high: { firstResponse: 60, resolution: 8 * 60 },
  medium: { firstResponse: 4 * 60, resolution: 24 * 60 },
  low: { firstResponse: 8 * 60, resolution: 72 * 60 },
};

export interface SlaDueDates {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
}

/**
 * Deadlines are computed once, when the ticket is raised, and stored on the row.
 * Everything downstream (dashboard, breach lists) then compares timestamps in
 * SQL rather than replaying the business calendar for every ticket it scans.
 */
export function slaDueDates(priority: WirePriority, createdAt: Date): SlaDueDates {
  const target = SLA_TARGET_MINUTES[priority];
  return {
    firstResponseDueAt: addBusinessMinutes(createdAt, target.firstResponse),
    resolutionDueAt: addBusinessMinutes(createdAt, target.resolution),
  };
}

/** Business minutes taken to first respond / resolve, or null while still pending. */
export function elapsedBusinessMinutes(from: Date, to: Date | null): number | null {
  return to ? businessMinutesBetween(from, to) : null;
}
