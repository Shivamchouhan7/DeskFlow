import { formatAge, getSlaPercent, canTransitionTo, STATUSES, STATUS_LABELS } from '../utils.js';
import { useDnd } from '../context/DndContext.jsx';
import styles from './TicketCard.module.css';

const PRIORITY_ICONS = {
  urgent: '🔴',
  high:   '🟠',
  medium: '🟡',
  low:    '🟢',
};

export default function TicketCard({ ticket, onMove, onDelete, onEdit }) {
  const slaPercent = getSlaPercent(ticket);
  const isBreaching = ticket.slaBreached;
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const { dragging, setDragOverCol } = useDnd();

  const nextStatuses = STATUSES.filter(
    (s) => s !== ticket.status && canTransitionTo(ticket.status, s)
  );

  // ── Drag handlers ──────────────────────────────────────
  const handleDragStart = (e) => {
    dragging.current = { ticketId: ticket._id, fromStatus: ticket.status };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticket._id);
    // Brief visual fade
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.45';
    }, 0);
  };

  const handleDragEnd = (e) => {
    dragging.current = null;
    setDragOverCol(null);
    if (e.target) e.target.style.opacity = '';
  };

  return (
    <article
      id={`ticket-${ticket._id}`}
      className={`${styles.card} ${isBreaching ? styles.breaching : ''} fade-in`}
      aria-label={`Ticket: ${ticket.subject}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* SLA bar */}
      <div className={styles.slaBar} aria-hidden="true">
        <div
          className={`${styles.slaFill} ${isBreaching ? styles.slaRed : slaPercent > 75 ? styles.slaOrange : styles.slaGreen}`}
          style={{ width: `${slaPercent}%` }}
        />
      </div>

      <div className={styles.body}>
        {/* Top row */}
        <div className={styles.topRow}>
          <span className={`${styles.priorityBadge} ${styles[`p_${ticket.priority}`]}`}>
            {ticket.priority.toUpperCase()}
          </span>
          {isBreaching && !isResolved && (
            <span className={styles.slaBreach} title="SLA Breached">⚠ SLA</span>
          )}
          <span className={styles.dragHandle} aria-hidden="true" title="Drag to move">⠿</span>
          <button
            id={`delete-${ticket._id}`}
            className={styles.deleteBtn}
            onClick={() => onDelete(ticket._id)}
            aria-label="Delete ticket"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Subject */}
        <h3 className={styles.subject} title={ticket.subject}>{ticket.subject}</h3>

        {/* Description */}
        <p className={styles.description}>{ticket.description}</p>

        {/* Meta */}
        <div className={styles.meta}>
          <span className={styles.email} title={ticket.customerEmail}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
              <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {ticket.customerEmail}
          </span>
          <span className={styles.age} title={`Created ${new Date(ticket.createdAt).toLocaleString()}`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {formatAge(ticket.ageMinutes)}
          </span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            id={`edit-${ticket._id}`}
            className={styles.editBtn}
            onClick={() => onEdit(ticket)}
            aria-label="Edit ticket"
          >
            Edit
          </button>
          <div className={styles.moveButtons}>
            {nextStatuses.map((s) => {
              const isForward = STATUSES.indexOf(s) > STATUSES.indexOf(ticket.status);
              return (
                <button
                  key={s}
                  id={`move-${ticket._id}-to-${s}`}
                  className={`${styles.moveBtn} ${isForward ? styles.forward : styles.backward}`}
                  onClick={() => onMove(ticket._id, s)}
                  aria-label={`Move to ${STATUS_LABELS[s]}`}
                  title={`Move to ${STATUS_LABELS[s]}`}
                >
                  {isForward ? '→' : '←'} {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
