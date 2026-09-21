/**
 * Business-hours calendar used for SLA maths.
 *
 * Policy (documented in the README): the clock only runs Mon-Fri, 09:00-18:00
 * in the server's local timezone. Time outside that window — nights, weekends —
 * does not count towards a target. A ticket raised at 17:50 on Friday with a
 * 30-business-minute response target is due at 09:20 on Monday, not 18:20 Friday.
 *
 * Holidays are deliberately out of scope for this POC.
 */

export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 18;

const MS_PER_MINUTE = 60_000;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfBusinessDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  return out;
}

function endOfBusinessDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  return out;
}

function nextBusinessDayStart(date: Date): Date {
  const out = startOfBusinessDay(date);
  do {
    out.setDate(out.getDate() + 1);
  } while (isWeekend(out));
  return out;
}

/** Move a timestamp forward to the first moment at or after it that is inside the business window. */
function clampIntoBusinessHours(at: Date): Date {
  const cursor = new Date(at);
  if (isWeekend(cursor)) {
    return nextBusinessDayStart(cursor);
  }
  if (cursor < startOfBusinessDay(cursor)) {
    return startOfBusinessDay(cursor);
  }
  if (cursor >= endOfBusinessDay(cursor)) {
    return nextBusinessDayStart(cursor);
  }
  return cursor;
}

/**
 * Add `minutes` of business time to `from` and return the resulting wall-clock
 * instant. This is what turns an SLA target into a plain timestamp column, so
 * breach checks become an indexable `now() > dueAt` comparison in SQL instead
 * of a per-row calendar calculation at query time.
 */
export function addBusinessMinutes(from: Date, minutes: number): Date {
  let cursor = clampIntoBusinessHours(from);
  let remaining = minutes;

  for (;;) {
    const availableToday = (endOfBusinessDay(cursor).getTime() - cursor.getTime()) / MS_PER_MINUTE;
    if (remaining <= availableToday) {
      return new Date(cursor.getTime() + remaining * MS_PER_MINUTE);
    }
    remaining -= availableToday;
    cursor = nextBusinessDayStart(cursor);
  }
}

/**
 * Business minutes elapsed between two instants — the reporting counterpart of
 * `addBusinessMinutes`, used for time-to-first-response and time-to-resolution.
 */
export function businessMinutesBetween(start: Date, end: Date): number {
  if (end <= start) {
    return 0;
  }

  let cursor = clampIntoBusinessHours(start);
  let total = 0;

  while (cursor < end) {
    const dayEnd = endOfBusinessDay(cursor);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    if (segmentEnd > cursor) {
      total += (segmentEnd.getTime() - cursor.getTime()) / MS_PER_MINUTE;
    }
    if (end <= dayEnd) {
      break;
    }
    cursor = nextBusinessDayStart(cursor);
  }

  return Math.round(total);
}
