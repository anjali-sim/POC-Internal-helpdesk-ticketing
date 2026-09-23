import { describe, expect, it } from 'vitest';

import { addBusinessMinutes } from '../../../lib/business-hours';
import {
  SLA_TARGET_MINUTES,
  elapsedBusinessMinutes,
  slaDueDates,
} from '../../../modules/tickets/ticket.sla';
import type { WirePriority } from '../../../modules/tickets/ticket.state-machine';

const PRIORITIES: WirePriority[] = ['low', 'medium', 'high', 'urgent'];

// Local-time dates keep the assertions timezone independent.
const monday = (h: number, m = 0) => new Date(2026, 0, 5, h, m, 0, 0);

describe('SLA_TARGET_MINUTES', () => {
  it('covers every priority', () => {
    expect(Object.keys(SLA_TARGET_MINUTES).sort()).toEqual([...PRIORITIES].sort());
  });

  it('gets stricter as priority rises', () => {
    const ordered: WirePriority[] = ['low', 'medium', 'high', 'urgent'];
    for (let i = 1; i < ordered.length; i++) {
      const looser = SLA_TARGET_MINUTES[ordered[i - 1] as WirePriority];
      const tighter = SLA_TARGET_MINUTES[ordered[i] as WirePriority];
      expect(tighter.firstResponse).toBeLessThan(looser.firstResponse);
      expect(tighter.resolution).toBeLessThan(looser.resolution);
    }
  });

  it('always leaves more room to resolve than to respond', () => {
    for (const priority of PRIORITIES) {
      const target = SLA_TARGET_MINUTES[priority];
      expect(target.resolution).toBeGreaterThan(target.firstResponse);
    }
  });
});

describe('slaDueDates', () => {
  it('puts an urgent ticket raised at 09:00 Monday on a 09:30 / 13:00 clock', () => {
    const { firstResponseDueAt, resolutionDueAt } = slaDueDates('urgent', monday(9));

    expect(firstResponseDueAt).toEqual(monday(9, 30));
    expect(resolutionDueAt).toEqual(monday(13));
  });

  it('carries a low-priority resolution target across business days', () => {
    // 72 business hours = 8 business days of 9h, Mon 5th .. Wed 14th (the 10th
    // and 11th are a weekend) => Wed 2026-01-14 18:00.
    expect(slaDueDates('low', monday(9)).resolutionDueAt).toEqual(new Date(2026, 0, 14, 18));
  });

  it('does not run the clock outside business hours', () => {
    // Raised 21:00 Monday: the 60-minute high-priority response clock starts
    // Tuesday 09:00.
    expect(slaDueDates('high', monday(21)).firstResponseDueAt).toEqual(new Date(2026, 0, 6, 10));
  });

  it('delegates to the business-hours calendar for every priority', () => {
    const createdAt = monday(16, 45);
    for (const priority of PRIORITIES) {
      const target = SLA_TARGET_MINUTES[priority];
      expect(slaDueDates(priority, createdAt)).toEqual({
        firstResponseDueAt: addBusinessMinutes(createdAt, target.firstResponse),
        resolutionDueAt: addBusinessMinutes(createdAt, target.resolution),
      });
    }
  });

  it('always leaves the response deadline at or before the resolution deadline', () => {
    for (const priority of PRIORITIES) {
      const { firstResponseDueAt, resolutionDueAt } = slaDueDates(priority, monday(9));
      expect(firstResponseDueAt.getTime()).toBeLessThanOrEqual(resolutionDueAt.getTime());
    }
  });
});

describe('elapsedBusinessMinutes', () => {
  it('returns null while the event has not happened', () => {
    expect(elapsedBusinessMinutes(monday(10), null)).toBeNull();
  });

  it('counts business minutes when it has', () => {
    expect(elapsedBusinessMinutes(monday(10), monday(12))).toBe(120);
  });

  it('excludes the overnight gap', () => {
    expect(elapsedBusinessMinutes(monday(17), new Date(2026, 0, 6, 10))).toBe(120);
  });

  it('returns 0, not a negative number, for an out-of-order pair', () => {
    expect(elapsedBusinessMinutes(monday(12), monday(10))).toBe(0);
  });
});
