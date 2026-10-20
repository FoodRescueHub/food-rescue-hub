const express = require('express');
const cors = require('cors');
const surplusRoutes = require('./routes/surplusRoutes');

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public participation guidance route (referenced in Capstone Brief)
app.get('/api/food-rescue/about', (req, res) => {
  res.status(200).json({
    platform: 'Community Food Rescue Coordinator',
    purpose: 'Matching verified donor surplus food with approved community organizations.',
    guidelines: [
      'Verified donors supply preparation, storage, and allergen information.',
      'Missing allergen information is always treated as UNKNOWN, never assumed allergen-free.',
      'Public users see sanitized availability summaries without private addresses or recipient identities.',
      'Reservations immediately reduce remaining quantity and require confirmed collection.'
    ]
  });
});

// Surplus Lot Routes
app.use('/api/surplus', surplusRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled App Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;
