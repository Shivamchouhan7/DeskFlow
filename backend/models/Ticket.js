const mongoose = require('mongoose');

/*
  SLA response time targets per priority level (in minutes).
  These are fixed business rules defined by the problem spec.
  urgent = 1 hr, high = 4 hrs, medium = 24 hrs, low = 72 hrs
*/
const SLA_TARGETS = {
  urgent: 60,
  high:   240,
  medium: 1440,
  low:    4320,
};

/*
  Status pipeline: tickets always move forward one step at a time.
  Backward movement is allowed but only one step (e.g. resolved → in_progress).
  We model this as an ordered integer so transition validity is just arithmetic.
*/
const STATUS_ORDER = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
const VALID_STATUSES = Object.keys(STATUS_ORDER);

const ticketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority. Use: low, medium, high, urgent',
      },
    },
    status: {
      type: String,
      default: 'open',
      enum: {
        values: VALID_STATUSES,
        message: '{VALUE} is not a valid status',
      },
    },
    // Set automatically when ticket reaches resolved; cleared if moved back
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/*
  ageMinutes — how long the ticket has been alive.
  For resolved tickets we freeze the clock at resolvedAt so the SLA
  calculation stays accurate even after the ticket is done.
  For everything else we measure against the current time.
*/
ticketSchema.virtual('ageMinutes').get(function () {
  const referencePoint =
    (this.status === 'resolved' || this.status === 'closed') && this.resolvedAt
      ? this.resolvedAt
      : new Date();
  return Math.floor((referencePoint - this.createdAt) / 60000);
});

/*
  slaBreached — true when ageMinutes exceeds the priority target.
  A ticket that was resolved late is still counted as breached so that
  historical accuracy is preserved in the stats.
*/
ticketSchema.virtual('slaBreached').get(function () {
  const target = SLA_TARGETS[this.priority];
  if (!target) return false;
  return this.ageMinutes > target;
});

/*
  validateTransition checks whether moving from `current` to `next`
  is permitted. The rule is: one step forward OR one step backward.
  Skipping (e.g. open → resolved) is always rejected.
*/
ticketSchema.statics.validateTransition = function (current, next) {
  const from = STATUS_ORDER[current];
  const to   = STATUS_ORDER[next];

  if (from === undefined || to === undefined) {
    return { valid: false, error: `Unknown status value in transition` };
  }

  const delta = to - from;

  if (delta === 0) {
    return { valid: false, error: `Ticket is already ${current}` };
  }

  if (Math.abs(delta) === 1) {
    return { valid: true };
  }

  const direction = delta > 0 ? 'forward' : 'backward';
  return {
    valid: false,
    error: `Cannot jump ${direction} from '${current}' to '${next}' — only one step at a time is allowed`,
  };
};

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.SLA_TARGETS  = SLA_TARGETS;
module.exports.STATUS_ORDER = STATUS_ORDER;
