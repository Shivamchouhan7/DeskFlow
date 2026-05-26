require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const ticketRouter = require('./routes/tickets');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/tickets', ticketRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deskflow';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
