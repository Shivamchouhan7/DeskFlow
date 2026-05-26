import TicketCard from './TicketCard.jsx';
import styles from './BoardColumn.module.css';
import { STATUS_LABELS, canTransitionTo } from '../utils.js';
import { useDnd } from '../context/DndContext.jsx';



export default function BoardColumn({ status, tickets, onMove, onDelete, onEdit, onDropError }) {
  const breachCount = tickets.filter((t) => t.slaBreached && status !== 'closed').length;
  const { dragging, dragOverCol, setDragOverCol } = useDnd();

  // ── Drop zone handlers ──────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    if (dragging.current && dragging.current.fromStatus !== status) {
      e.dataTransfer.dropEffect = canTransitionTo(dragging.current.fromStatus, status)
        ? 'move'
        : 'none';
      setDragOverCol(status);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear when leaving the column element itself, not a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragging.current) return;

    const { ticketId, fromStatus } = dragging.current;
    dragging.current = null;

    if (fromStatus === status) return;

    if (!canTransitionTo(fromStatus, status)) {
      // Invalid — snap back with error message
      onDropError(`Cannot move directly from "${STATUS_LABELS[fromStatus]}" to "${STATUS_LABELS[status]}". Only adjacent steps are allowed.`);
      return;
    }

    onMove(ticketId, status);
  };

  const isDragTarget = dragOverCol === status;
  const isDragInvalid = isDragTarget && dragging.current && !canTransitionTo(dragging.current.fromStatus, status);

  return (
    <section
      id={`column-${status}`}
      className={`
        ${styles.column}
        ${isDragTarget && !isDragInvalid ? styles.dropTarget : ''}
        ${isDragInvalid ? styles.dropInvalid : ''}
      `}
      aria-label={`${STATUS_LABELS[status]} column`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{STATUS_LABELS[status]}</h2>
        </div>
        <div className={styles.badges}>
          {breachCount > 0 && (
            <span className={styles.breachBadge} title={`${breachCount} SLA breach${breachCount > 1 ? 'es' : ''}`}>
              ⚠ {breachCount}
            </span>
          )}
          <span className={styles.countBadge}>{tickets.length}</span>
        </div>
      </div>


      {/* Drop zone hint */}
      {isDragTarget && (
        <div className={`${styles.dropHint} ${isDragInvalid ? styles.dropHintInvalid : styles.dropHintValid}`}>
          {isDragInvalid
            ? `⛔ Invalid transition to ${STATUS_LABELS[status]}`
            : `Drop here → ${STATUS_LABELS[status]}`}
        </div>
      )}

      {/* Tickets list */}
      <div className={styles.list} role="list">
        {tickets.length === 0 && !isDragTarget ? (
          <div className={styles.empty} role="listitem">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <p>No tickets</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket._id} role="listitem">
              <TicketCard
                ticket={ticket}
                onMove={onMove}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
