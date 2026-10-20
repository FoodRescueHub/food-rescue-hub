const express = require('express');
const router = express.Router();
const surplusController = require('../controllers/surplusController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/surplus
 * @desc    Donor creates a new surplus food listing
 * @access  Protected (Donor / Coordinator with verified organization)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['donor', 'coordinator']),
  surplusController.createSurplusLot
);

/**
 * @route   GET /api/surplus
 * @desc    Get available surplus food listings (Sanitized for public users)
 * @access  Public (Optional authentication for extended permissions)
 */
router.get(
  '/',
  optionalAuth,
  surplusController.getSurplusLots
);

/**
 * @route   GET /api/surplus/:id
 * @desc    Get single surplus lot details
 * @access  Public (Sanitized) / Protected (Full details for owning donor / coordinator)
 */
router.get(
  '/:id',
  optionalAuth,
  surplusController.getSurplusLotById
);

/**
 * @route   PATCH /api/surplus/:id
 * @desc    Donor edits a surplus listing (corrects errors, updates quantities/handling, or cancels)
 * @access  Protected (Owning Donor / Platform Coordinator)
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(['donor', 'coordinator']),
  surplusController.updateSurplusLot
);

module.exports = router;
