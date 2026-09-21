import { Priority, TicketStatus as PrismaTicketStatus } from '@prisma/client';

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['assigned'],
  assigned: ['in_progress', 'reopened'],
  in_progress: ['resolved', 'reopened'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress'],
};

export function isLegalTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

const WIRE_TO_PRISMA_STATUS: Record<TicketStatus, PrismaTicketStatus> = {
  new: PrismaTicketStatus.NEW,
  assigned: PrismaTicketStatus.ASSIGNED,
  in_progress: PrismaTicketStatus.IN_PROGRESS,
  resolved: PrismaTicketStatus.RESOLVED,
  closed: PrismaTicketStatus.CLOSED,
  reopened: PrismaTicketStatus.REOPENED,
};

const PRISMA_TO_WIRE_STATUS: Record<PrismaTicketStatus, TicketStatus> = {
  [PrismaTicketStatus.NEW]: 'new',
  [PrismaTicketStatus.ASSIGNED]: 'assigned',
  [PrismaTicketStatus.IN_PROGRESS]: 'in_progress',
  [PrismaTicketStatus.RESOLVED]: 'resolved',
  [PrismaTicketStatus.CLOSED]: 'closed',
  [PrismaTicketStatus.REOPENED]: 'reopened',
};

export function toPrismaStatus(status: TicketStatus): PrismaTicketStatus {
  return WIRE_TO_PRISMA_STATUS[status];
}

export function toWireStatus(status: PrismaTicketStatus): TicketStatus {
  return PRISMA_TO_WIRE_STATUS[status];
}

export type WirePriority = 'low' | 'medium' | 'high' | 'urgent';

const WIRE_TO_PRISMA_PRIORITY: Record<WirePriority, Priority> = {
  low: Priority.LOW,
  medium: Priority.MEDIUM,
  high: Priority.HIGH,
  urgent: Priority.URGENT,
};

const PRISMA_TO_WIRE_PRIORITY: Record<Priority, WirePriority> = {
  [Priority.LOW]: 'low',
  [Priority.MEDIUM]: 'medium',
  [Priority.HIGH]: 'high',
  [Priority.URGENT]: 'urgent',
};

export function toPrismaPriority(priority: WirePriority): Priority {
  return WIRE_TO_PRISMA_PRIORITY[priority];
}

export function toWirePriority(priority: Priority): WirePriority {
  return PRISMA_TO_WIRE_PRIORITY[priority];
}
