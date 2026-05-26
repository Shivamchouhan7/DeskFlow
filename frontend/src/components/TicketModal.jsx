import { useState, useEffect, useRef } from 'react';
import styles from './TicketModal.module.css';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const EMPTY = { subject: '', description: '', customerEmail: '', priority: 'medium' };

export default function TicketModal({ isOpen, onClose, onSubmit, initialData, isLoading }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const firstRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData
        ? { subject: initialData.subject, description: initialData.description, customerEmail: initialData.customerEmail, priority: initialData.priority }
        : EMPTY
      );
      setErrors({});
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [isOpen, initialData]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!form.subject.trim()) errs.subject = 'Subject is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.customerEmail.trim()) errs.customerEmail = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.customerEmail)) errs.customerEmail = 'Enter a valid email';
    if (!form.priority) errs.priority = 'Priority is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`${styles.modal} fade-in`}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            {initialData ? 'Edit Ticket' : 'New Ticket'}
          </h2>
          <button id="modal-close-btn" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="ticket-form" onSubmit={handleSubmit} noValidate className={styles.form}>
          {/* Subject */}
          <div className={styles.field}>
            <label htmlFor="ticket-subject" className={styles.label}>Subject <span className={styles.required}>*</span></label>
            <input
              id="ticket-subject"
              ref={firstRef}
              type="text"
              className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
              placeholder="e.g. Cannot log in to dashboard"
              value={form.subject}
              onChange={set('subject')}
              maxLength={200}
            />
            {errors.subject && <span className={styles.errMsg}>{errors.subject}</span>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="ticket-description" className={styles.label}>Description <span className={styles.required}>*</span></label>
            <textarea
              id="ticket-description"
              className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={set('description')}
              rows={4}
              maxLength={2000}
            />
            {errors.description && <span className={styles.errMsg}>{errors.description}</span>}
          </div>

          {/* Two column row */}
          <div className={styles.row}>
            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="ticket-email" className={styles.label}>Customer Email <span className={styles.required}>*</span></label>
              <input
                id="ticket-email"
                type="email"
                className={`${styles.input} ${errors.customerEmail ? styles.inputError : ''}`}
                placeholder="customer@example.com"
                value={form.customerEmail}
                onChange={set('customerEmail')}
              />
              {errors.customerEmail && <span className={styles.errMsg}>{errors.customerEmail}</span>}
            </div>

            {/* Priority */}
            <div className={styles.field}>
              <label className={styles.label}>Priority <span className={styles.required}>*</span></label>
              <div className={styles.priorityGrid} role="radiogroup" aria-label="Priority">
                {PRIORITIES.map((p) => (
                  <label key={p} className={`${styles.priorityOpt} ${styles[`pri_${p}`]} ${form.priority === p ? styles.priSelected : ''}`}>
                    <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={set('priority')} className={styles.srOnly} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>
              {errors.priority && <span className={styles.errMsg}>{errors.priority}</span>}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button id="modal-cancel-btn" type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button id="modal-submit-btn" type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : initialData ? 'Save Changes' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
