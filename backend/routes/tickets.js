const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

const SLA_TARGETS = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320,
};

const STATUS_ORDER = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

function validateTransition(current, next) {
  const from = STATUS_ORDER[current];
  const to = STATUS_ORDER[next];
  if (from === undefined || to === undefined) return { valid: false, error: 'Unknown status' };
  const delta = to - from;
  if (delta === 0) return { valid: false, error: 'Already in that status' };
  if (Math.abs(delta) === 1) return { valid: true };
  return { valid: false, error: 'Only one step at a time allowed' };
}

function processTicket(t) {
  // Convert Supabase row to expected frontend format
  const createdAt = new Date(t.created_at);
  const resolvedAt = t.resolved_at ? new Date(t.resolved_at) : null;
  
  const referencePoint = ((t.status === 'resolved' || t.status === 'closed') && resolvedAt) 
    ? resolvedAt 
    : new Date();
  
  const ageMinutes = Math.floor((referencePoint - createdAt) / 60000);
  const slaBreached = ageMinutes > (SLA_TARGETS[t.priority] || 99999);

  return {
    _id: t.id,
    subject: t.subject,
    description: t.description,
    customerEmail: t.customer_email,
    priority: t.priority,
    status: t.status,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
    ageMinutes,
    slaBreached
  };
}

// GET /tickets/stats
router.get('/stats', async (req, res) => {
  const { data: tickets, error } = await supabase.from('tickets').select('*');
  if (error) return res.status(500).json({ error: error.message });
  
  const processed = tickets.map(processTicket);
  const byStatus = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  let slaBreachedOpen = 0;

  for (const t of processed) {
    if (byStatus[t.status] !== undefined) byStatus[t.status]++;
    if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
    if (t.slaBreached && (t.status === 'open' || t.status === 'in_progress')) slaBreachedOpen++;
  }

  res.json({ byStatus, byPriority, slaBreachedOpen, total: processed.length });
});

// POST /tickets
router.post('/', async (req, res) => {
  const { subject, description, customerEmail, priority } = req.body;
  const missing = ['subject', 'description', 'customerEmail', 'priority'].filter(f => !req.body[f]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

  const { data, error } = await supabase.from('tickets').insert([{
    subject,
    description,
    customer_email: customerEmail,
    priority
  }]).select().single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(processTicket(data));
});

// GET /tickets
router.get('/', async (req, res) => {
  let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
  
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.priority) query = query.eq('priority', req.query.priority);

  const { data: tickets, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let result = tickets.map(processTicket);
  if (req.query.breached === 'true') result = result.filter(t => t.slaBreached);
  
  res.json(result);
});

// PATCH /tickets/:id
router.patch('/:id', async (req, res) => {
  const { data: ticket, error: fetchErr } = await supabase.from('tickets').select('*').eq('id', req.params.id).single();
  if (fetchErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });

  const updates = {};
  const { status, subject, description, customerEmail, priority } = req.body;

  if (status && status !== ticket.status) {
    const check = validateTransition(ticket.status, status);
    if (!check.valid) return res.status(400).json({ error: check.error });

    updates.status = status;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    if (ticket.status === 'resolved' && status !== 'resolved') updates.resolved_at = null;
  }

  if (subject !== undefined) updates.subject = subject;
  if (description !== undefined) updates.description = description;
  if (customerEmail !== undefined) updates.customer_email = customerEmail;
  if (priority !== undefined) updates.priority = priority;

  const { data: updated, error: updateErr } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(processTicket(updated));
});

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('tickets').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Ticket removed' });
});

module.exports = router;
