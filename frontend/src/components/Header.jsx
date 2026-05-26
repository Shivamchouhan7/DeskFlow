import styles from './Header.module.css';

export default function Header({ stats, onNewTicket }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <h1 className={styles.title}>DeskFlow</h1>
          <span className={styles.subtitle}>Support Ticket Triage</span>
        </div>

        <div className={styles.statsBar}>
          {stats && (
            <>
              <div className={styles.stat}>
                <span className={styles.statVal}>{stats.total ?? '—'}</span>
                <span className={styles.statLabel}>Total</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.stat}>
                <span className={styles.statVal} style={{ color: 'var(--status-open)' }}>
                  {stats.byStatus?.open ?? '—'}
                </span>
                <span className={styles.statLabel}>Open</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.stat}>
                <span
                  className={styles.statVal}
                  style={{ color: stats.slaBreachedOpen > 0 ? 'var(--sla-breach)' : 'var(--text-muted)' }}
                >
                  {stats.slaBreachedOpen ?? '—'}
                </span>
                <span className={styles.statLabel}>SLA Breach</span>
              </div>
            </>
          )}
        </div>

        <button id="new-ticket-btn" className={styles.newBtn} onClick={onNewTicket}>
          + New Ticket
        </button>
      </div>
    </header>
  );
}
