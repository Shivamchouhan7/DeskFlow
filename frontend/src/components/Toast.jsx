import { useEffect } from 'react';
import styles from './Toast.module.css';

export default function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  };

  return (
    <div
      id="toast-notification"
      className={`${styles.toast} ${styles[type]} slide-in`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon}>{icons[type] || icons.info}</span>
      <span className={styles.msg}>{message}</span>
      <button className={styles.close} onClick={onDismiss} aria-label="Dismiss notification">✕</button>
    </div>
  );
}
