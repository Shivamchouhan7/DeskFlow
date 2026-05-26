import styles from './FilterBar.module.css';

const PRIORITIES = ['', 'low', 'medium', 'high', 'urgent'];
const PRIORITY_LABELS = { '': 'All', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export default function FilterBar({ filters, onChange, onRefresh, isLoading }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            id="filter-search"
            type="search"
            className={styles.search}
            placeholder="Search tickets…"
            value={filters.search || ''}
            onChange={set('search')}
            aria-label="Search tickets"
          />
        </div>

        {/* Priority filter */}
        <select
          id="filter-priority"
          className={styles.select}
          value={filters.priority || ''}
          onChange={set('priority')}
          aria-label="Filter by priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]} Priority</option>
          ))}
        </select>

        {/* SLA toggle */}
        <label className={styles.toggle} htmlFor="filter-sla">
          <input
            id="filter-sla"
            type="checkbox"
            checked={filters.breached || false}
            onChange={(e) => onChange({ ...filters, breached: e.target.checked })}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>SLA Breached only</span>
        </label>
      </div>

      <button
        id="refresh-btn"
        className={styles.refreshBtn}
        onClick={onRefresh}
        disabled={isLoading}
        aria-label="Refresh tickets"
        title="Refresh"
      >
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          className={isLoading ? styles.spinning : ''}
          aria-hidden="true"
        >
          <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
