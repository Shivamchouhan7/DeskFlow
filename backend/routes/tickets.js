const express = require('express');
const router  = express.Router();
const Ticket  = require('../models/Ticket');

/*
  Builds the plain response object for a ticket.
  We call virtuals explicitly here because some Mongoose versions
  don't include them by default when serializing inside an array.
*/
function buildTicketResponse(ticket) {
  return {
    _id:           ticket._id,
    subject:       ticket.subject,
    description:   ticket.description,
    customerEmail: ticket.customerEmail,
    priority:      ticket.priority,
    status:        ticket.status,
    createdAt:     ticket.createdAt,
    resolvedAt:    ticket.resolvedAt || null,
    ageMinutes:    ticket.ageMinutes,
    slaBreached:   ticket.slaBreached,
  };
}

// GET /tickets/stats
// Must be declared before /:id so Express doesn't treat "stats" as a Mongo ID
router.get('/stats', async (req, res) => {
  try {
    const all = await Ticket.find({});

    const byStatus   = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    let breachedAndOpen = 0;

    for (const t of all) {
      if (byStatus[t.status]     !== undefined) byStatus[t.status]++;
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;

      // Only count breaches on tickets that are still being worked on
      const stillActive = t.status === 'open' || t.status === 'in_progress';
      if (t.slaBreached && stillActive) breachedAndOpen++;
    }

    res.json({ byStatus, byPriority, slaBreachedOpen: breachedAndOpen, total: all.length });
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

// POST /tickets
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;

    // Collect missing fields before hitting Mongoose so we return a helpful message
    const missing = ['subject', 'description', 'customerEmail', 'priority'].filter(
      (f) => !req.body[f]
    );
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const ticket = await new Ticket({ subject, description, customerEmail, priority }).save();
    res.status(201).json(buildTicketResponse(ticket));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('; ');
      return res.status(400).json({ error: msg });
    }
    console.error('[POST /tickets]', err.message);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// GET /tickets  — supports ?status, ?priority, ?breached=true (combinable)
router.get('/', async (req, res) => {
  try {
    const query = {};

    const allowedStatuses   = ['open', 'in_progress', 'resolved', 'closed'];
    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({ error: `Invalid status: ${req.query.status}` });
      }
      query.status = req.query.status;
    }

    if (req.query.priority) {
      if (!allowedPriorities.includes(req.query.priority)) {
        return res.status(400).json({ error: `Invalid priority: ${req.query.priority}` });
      }
      query.priority = req.query.priority;
    }

    let tickets = (await Ticket.find(query).sort({ createdAt: -1 })).map(buildTicketResponse);

    // breached filter is applied after fetch because slaBreached is a derived virtual,
    // not a stored field — we can't query it from MongoDB directly
    if (req.query.breached === 'true') {
      tickets = tickets.filter((t) => t.slaBreached);
    }

    res.json(tickets);
  } catch (err) {
    console.error('[GET /tickets]', err.message);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// PATCH /tickets/:id
router.patch('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { status, subject, description, customerEmail, priority } = req.body;

    if (status && status !== ticket.status) {
      const check = Ticket.validateTransition(ticket.status, status);
      if (!check.valid) return res.status(400).json({ error: check.error });

      // Moving into resolved: record the timestamp
      if (status === 'resolved') ticket.resolvedAt = new Date();

      // Rolling back from resolved: wipe the timestamp so ageMinutes resumes growing
      if (ticket.status === 'resolved' && status !== 'resolved') ticket.resolvedAt = null;

      ticket.status = status;
    }

    if (subject       !== undefined) ticket.subject       = subject;
    if (description   !== undefined) ticket.description   = description;
    if (customerEmail !== undefined) ticket.customerEmail = customerEmail;
    if (priority      !== undefined) ticket.priority      = priority;

    await ticket.save();
    res.json(buildTicketResponse(ticket));
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join('; ') });
    }
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ticket ID format' });
    console.error('[PATCH /tickets/:id]', err.message);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Ticket.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket removed' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ticket ID format' });
    console.error('[DELETE /tickets/:id]', err.message);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
