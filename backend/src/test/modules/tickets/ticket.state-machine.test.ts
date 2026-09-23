import { Priority, TicketStatus as PrismaTicketStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  TRANSITIONS,
  isLegalTransition,
  toPrismaPriority,
  toPrismaStatus,
  toWirePriority,
  toWireStatus,
  type TicketStatus,
  type WirePriority,
} from '../../../modules/tickets/ticket.state-machine';

const ALL_STATUSES = Object.keys(TRANSITIONS) as TicketStatus[];

describe('isLegalTransition', () => {
  it.each([
    ['new', 'assigned'],
    ['assigned', 'in_progress'],
    ['in_progress', 'resolved'],
    ['resolved', 'closed'],
    ['closed', 'reopened'],
    ['reopened', 'in_progress'],
    ['reopened', 'assigned'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(isLegalTransition(from, to)).toBe(true);
  });

  it.each([
    ['new', 'resolved'],
    ['new', 'in_progress'],
    ['new', 'closed'],
    ['assigned', 'closed'],
    ['in_progress', 'closed'],
    ['closed', 'assigned'],
    ['resolved', 'in_progress'],
  ] as const)('blocks %s -> %s', (from, to) => {
    expect(isLegalTransition(from, to)).toBe(false);
  });

  it('never allows a status to transition to itself', () => {
    for (const status of ALL_STATUSES) {
      expect(isLegalTransition(status, status)).toBe(false);
    }
  });

  it('returns false rather than throwing for a status outside the table', () => {
    expect(isLegalTransition('archived' as TicketStatus, 'closed')).toBe(false);
  });

  it('only ever names statuses that exist in the table', () => {
    for (const targets of Object.values(TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES).toContain(target);
      }
    }
  });

  it('keeps every status reachable from new, so no ticket can strand', () => {
    const seen = new Set<TicketStatus>(['new']);
    const queue: TicketStatus[] = ['new'];
    while (queue.length) {
      for (const next of TRANSITIONS[queue.shift() as TicketStatus]) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].sort()).toEqual([...ALL_STATUSES].sort());
  });
});

describe('status wire <-> prisma mapping', () => {
  it.each([
    ['new', PrismaTicketStatus.NEW],
    ['assigned', PrismaTicketStatus.ASSIGNED],
    ['in_progress', PrismaTicketStatus.IN_PROGRESS],
    ['resolved', PrismaTicketStatus.RESOLVED],
    ['closed', PrismaTicketStatus.CLOSED],
    ['reopened', PrismaTicketStatus.REOPENED],
  ] as const)('maps %s both ways', (wire, prismaStatus) => {
    expect(toPrismaStatus(wire)).toBe(prismaStatus);
    expect(toWireStatus(prismaStatus)).toBe(wire);
  });

  it('covers every status in the transition table', () => {
    for (const status of ALL_STATUSES) {
      expect(toWireStatus(toPrismaStatus(status))).toBe(status);
    }
  });

  it('covers every Prisma enum member', () => {
    for (const status of Object.values(PrismaTicketStatus)) {
      expect(toPrismaStatus(toWireStatus(status))).toBe(status);
    }
  });
});

describe('priority wire <-> prisma mapping', () => {
  it.each([
    ['low', Priority.LOW],
    ['medium', Priority.MEDIUM],
    ['high', Priority.HIGH],
    ['urgent', Priority.URGENT],
  ] as const)('maps %s both ways', (wire, prismaPriority) => {
    expect(toPrismaPriority(wire)).toBe(prismaPriority);
    expect(toWirePriority(prismaPriority)).toBe(wire);
  });

  it('round-trips every Prisma priority', () => {
    for (const priority of Object.values(Priority)) {
      expect(toPrismaPriority(toWirePriority(priority))).toBe(priority);
    }
  });

  it('emits lowercase wire values', () => {
    for (const priority of Object.values(Priority)) {
      const wire: WirePriority = toWirePriority(priority);
      expect(wire).toBe(wire.toLowerCase());
    }
  });
});
