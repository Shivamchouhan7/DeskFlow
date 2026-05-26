export const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const STATUS_ORDER = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const SLA_MINUTES = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320,
};

export function formatAge(minutes) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return `${d}d ${h}h`;
}

export function getSlaPercent(ticket) {
  const target = SLA_MINUTES[ticket.priority];
  if (!target) return 0;
  return Math.min((ticket.ageMinutes / target) * 100, 100);
}

export function canTransitionTo(currentStatus, targetStatus) {
  const curr = STATUS_ORDER[currentStatus];
  const next = STATUS_ORDER[targetStatus];
  const diff = next - curr;
  return diff === 1 || diff === -1;
}

export function getNextStatus(status) {
  const idx = STATUSES.indexOf(status);
  return idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
}

export function getPrevStatus(status) {
  const idx = STATUSES.indexOf(status);
  return idx > 0 ? STATUSES[idx - 1] : null;
}
