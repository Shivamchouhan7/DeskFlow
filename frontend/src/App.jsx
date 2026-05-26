import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import { STATUSES } from './utils.js';
import { DndProvider } from './context/DndContext.jsx';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import BoardColumn from './components/BoardColumn.jsx';
import TicketModal from './components/TicketModal.jsx';
import Toast from './components/Toast.jsx';
import styles from './App.module.css';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ search: '', priority: '', breached: false });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  // ── Fetch tickets ────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.priority) params.priority = filters.priority;
      if (filters.breached)  params.breached = 'true';
      const data = await api.getTickets(params);
      setTickets(data);
    } catch (err) {
      showToast(err.message || 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.priority, filters.breached]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (_) {}
  }, []);

  // Initial load + periodic refresh every 60s
  useEffect(() => {
    fetchTickets();
    fetchStats();
    const interval = setInterval(() => {
      fetchTickets();
      fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTickets, fetchStats]);

  // ── Create ticket ────────────────────────────────────────
  const handleCreate = async (form) => {
    setSubmitting(true);
    try {
      const ticket = await api.createTicket(form);
      setTickets((prev) => [ticket, ...prev]);
      setModalOpen(false);
      fetchStats();
      showToast('Ticket created successfully! 🎫');
    } catch (err) {
      showToast(err.message || 'Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit ticket ──────────────────────────────────────────
  const handleEdit = async (form) => {
    if (!editingTicket) return;
    setSubmitting(true);
    try {
      const updated = await api.updateTicket(editingTicket._id, form);
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setModalOpen(false);
      setEditingTicket(null);
      fetchStats();
      showToast('Ticket updated! ✏️');
    } catch (err) {
      showToast(err.message || 'Failed to update ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Move ticket (status transition) — used by button AND drag-drop ──────────
  const handleMove = async (id, newStatus) => {
    const prev = tickets.find((t) => t._id === id);
    // Optimistic update
    setTickets((ts) => ts.map((t) => t._id === id ? { ...t, status: newStatus } : t));
    try {
      const updated = await api.updateTicket(id, { status: newStatus });
      setTickets((ts) => ts.map((t) => t._id === updated._id ? updated : t));
      fetchStats();
      showToast(`Moved to ${newStatus.replace('_', ' ')} ✓`);
    } catch (err) {
      // Roll back optimistic update
      setTickets((ts) => ts.map((t) => t._id === id ? prev : t));
      showToast(err.message || 'Transition not allowed', 'error');
    }
  };

  // ── Delete ticket ────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return;
    const prev = tickets.find((t) => t._id === id);
    setTickets((ts) => ts.filter((t) => t._id !== id));
    try {
      await api.deleteTicket(id);
      fetchStats();
      showToast('Ticket deleted.');
    } catch (err) {
      setTickets((ts) => [prev, ...ts]);
      showToast(err.message || 'Failed to delete ticket', 'error');
    }
  };

  // ── Drop error (invalid drag transition) ─────────────────
  const handleDropError = (msg) => showToast(msg, 'error');

  // ── Open edit modal ──────────────────────────────────────
  const openEdit = (ticket) => {
    setEditingTicket(ticket);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingTicket(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTicket(null);
  };

  // ── Filter + search locally ──────────────────────────────
  const filtered = tickets.filter((t) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q)
    );
  });

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <DndProvider>
      <div className={styles.app}>
        <Header stats={stats} onNewTicket={openCreate} />

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onRefresh={() => { fetchTickets(); fetchStats(); }}
          isLoading={loading}
        />

        {/* Board */}
        <main className={styles.board} id="board">
          {loading && tickets.length === 0 ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>Loading tickets…</p>
            </div>
          ) : (
            STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tickets={byStatus[status] || []}
                onMove={handleMove}
                onDelete={handleDelete}
                onEdit={openEdit}
                onDropError={handleDropError}
              />
            ))
          )}
        </main>

        {/* Create/Edit Modal */}
        <TicketModal
          isOpen={modalOpen}
          onClose={closeModal}
          onSubmit={editingTicket ? handleEdit : handleCreate}
          initialData={editingTicket}
          isLoading={submitting}
        />

        {/* Toast notifications */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />
        )}
      </div>
    </DndProvider>
  );
}
