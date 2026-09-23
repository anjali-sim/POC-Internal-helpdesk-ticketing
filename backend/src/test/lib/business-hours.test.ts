import { describe, expect, it } from 'vitest';

import { addBusinessMinutes, businessMinutesBetween } from '../../lib/business-hours';

/**
 * The calendar works in the server's *local* timezone, so every date here is
 * built from local components (new Date(y, m, d, h, m)) and asserted the same
 * way. The suite therefore passes in any TZ.
 *
 * Reference week: Mon 2026-01-05 .. Sun 2026-01-11.
 */
const monday = (h: number, m = 0) => new Date(2026, 0, 5, h, m, 0, 0);
const tuesday = (h: number, m = 0) => new Date(2026, 0, 6, h, m, 0, 0);
const friday = (h: number, m = 0) => new Date(2026, 0, 9, h, m, 0, 0);
const saturday = (h: number, m = 0) => new Date(2026, 0, 10, h, m, 0, 0);
const sunday = (h: number, m = 0) => new Date(2026, 0, 11, h, m, 0, 0);

describe('addBusinessMinutes', () => {
  it('adds within the same business day', () => {
    expect(addBusinessMinutes(monday(10), 90)).toEqual(monday(11, 30));
  });

  it('adds zero minutes without moving an in-hours timestamp', () => {
    expect(addBusinessMinutes(monday(10, 15), 0)).toEqual(monday(10, 15));
  });

  it('starts the clock at 09:00 for a ticket raised before opening', () => {
    expect(addBusinessMinutes(monday(6, 30), 30)).toEqual(monday(9, 30));
  });

  it('rolls to the next morning for a ticket raised after closing', () => {
    expect(addBusinessMinutes(monday(20), 30)).toEqual(tuesday(9, 30));
  });

  it('treats 18:00 exactly as closed and rolls over', () => {
    expect(addBusinessMinutes(monday(18), 15)).toEqual(tuesday(9, 15));
  });

  it('spills the remainder into the next day when the target overruns closing', () => {
    // 17:00 Monday + 2h: 1h left on Monday, 1h carried into Tuesday.
    expect(addBusinessMinutes(monday(17), 120)).toEqual(tuesday(10));
  });

  it('skips the weekend — the README example', () => {
    // Fri 17:50 + 30 business minutes => Mon 09:20, not Fri 18:20.
    expect(addBusinessMinutes(friday(17, 50), 30)).toEqual(new Date(2026, 0, 12, 9, 20));
  });

  it('starts Monday morning for a Saturday arrival', () => {
    expect(addBusinessMinutes(saturday(12), 60)).toEqual(new Date(2026, 0, 12, 10));
  });

  it('starts Monday morning for a Sunday arrival', () => {
    expect(addBusinessMinutes(sunday(23), 60)).toEqual(new Date(2026, 0, 12, 10));
  });

  it('spreads a multi-day target across business days only', () => {
    // 9h per day. Mon 09:00 + 27h = three full days => Wed 18:00.
    expect(addBusinessMinutes(monday(9), 27 * 60)).toEqual(new Date(2026, 0, 7, 18));
  });

  it('carries a long target over a weekend', () => {
    // Fri 09:00 + 18h = 9h Friday + 9h Monday => Mon 18:00.
    expect(addBusinessMinutes(friday(9), 18 * 60)).toEqual(new Date(2026, 0, 12, 18));
  });
});

describe('businessMinutesBetween', () => {
  it('measures a span inside one day', () => {
    expect(businessMinutesBetween(monday(10), monday(12, 30))).toBe(150);
  });

  it('returns 0 when the end precedes the start', () => {
    expect(businessMinutesBetween(monday(12), monday(10))).toBe(0);
  });

  it('returns 0 for an identical start and end', () => {
    expect(businessMinutesBetween(monday(12), monday(12))).toBe(0);
  });

  it('ignores time before opening', () => {
    expect(businessMinutesBetween(monday(6), monday(10))).toBe(60);
  });

  it('ignores the overnight gap', () => {
    // 17:00 Mon -> 10:00 Tue = 1h Monday + 1h Tuesday.
    expect(businessMinutesBetween(monday(17), tuesday(10))).toBe(120);
  });

  it('ignores the weekend', () => {
    // Fri 17:00 -> Mon 10:00 = 1h Friday + 1h Monday.
    expect(businessMinutesBetween(friday(17), new Date(2026, 0, 12, 10))).toBe(120);
  });

  it('counts a full business day as 9 hours', () => {
    expect(businessMinutesBetween(monday(9), monday(18))).toBe(9 * 60);
  });

  it('counts whole days across a span that starts and ends out of hours', () => {
    // Sat 3rd 08:00 -> Wed 7th 09:00: all of Mon and Tue = 18h.
    expect(businessMinutesBetween(new Date(2026, 0, 3, 8), new Date(2026, 0, 7, 9))).toBe(18 * 60);
  });

  it('returns 0 for a span that lies entirely outside business hours', () => {
    expect(businessMinutesBetween(saturday(9), sunday(17))).toBe(0);
  });

  it('round-trips with addBusinessMinutes', () => {
    const due = addBusinessMinutes(friday(17, 50), 30);
    expect(businessMinutesBetween(friday(17, 50), due)).toBe(30);
  });
});
