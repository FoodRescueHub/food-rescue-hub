const express = require("express");
const mongoose = require("mongoose");

const Handover = require("../models/Handover");
const Reservation = require("../models/Reservation");
const VolunteerAssignment = require("../models/VolunteerAssignment");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// POST /api/reservations/:id/handover
// Donor or Coordinator records actual handed-over quantity
// =====================================================
router.post(
  "/reservations/:id/handover",
  authenticateToken,
  authorizeRoles("DONOR", "COORDINATOR"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { quantityHandedOver, notes, handoverTime } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid reservation ID."
        });
      }

      if (!Number.isFinite(quantityHandedOver) || quantityHandedOver <= 0) {
        return res.status(400).json({
          message: "quantityHandedOver must be a valid number greater than zero."
        });
      }

      // 1. Find reservation with associated surplus lot
      const reservation = await Reservation.findById(id).populate(
        "surplusLotId",
        "foodName donor quantity pickupAddress status"
      );

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found."
        });
      }

      // 2. Reservation must be CONFIRMED
      if (reservation.status !== "CONFIRMED") {
        return res.status(400).json({
          message: `Cannot record handover for reservation in "${reservation.status}" status. Reservation must be CONFIRMED.`
        });
      }

      // 3. If caller is DONOR, ensure they own the surplus donation
      if (req.user.role === "DONOR") {
        const donorId = reservation.surplusLotId?.donor
          ? reservation.surplusLotId.donor.toString()
          : null;

        if (donorId && donorId !== req.user.id) {
          return res.status(403).json({
            message: "Access denied. You are not the donor for this reservation."
          });
        }
      }

      // 4. Ensure a handover has not already been recorded
      const existingHandover = await Handover.findOne({ reservationId: id });
      if (existingHandover) {
        return res.status(400).json({
          message: "A handover record has already been submitted for this reservation."
        });
      }

      // 5. Determine donorId and recipientId
      const donorId =
        reservation.surplusLotId?.donor?.toString() || req.user.id;
      const recipientId =
        reservation.createdBy?.toString() ||
        reservation.recipientOrganizationId?.toString();

      // 6. Create handover record
      const handover = await Handover.create({
        reservationId: reservation._id,
        donorId,
        recipientId,
        quantityHandedOver,
        recordedBy: req.user.id,
        handoverTime: handoverTime ? new Date(handoverTime) : new Date(),
        notes: typeof notes === "string" ? notes.trim() : ""
      });

      return res.status(201).json({
        message: "Food handover recorded successfully.",
        handover
      });
    } catch (error) {
      console.error("Handover record error:", error);
      return res.status(500).json({
        message: "Could not record food handover."
      });
    }
  }
);

// =====================================================
// POST /api/reservations/:id/collection
// Recipient coordinator confirms collection
// =====================================================
router.post(
  "/reservations/:id/collection",
  authenticateToken,
  authorizeRoles("RECIPIENT", "COORDINATOR"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid reservation ID."
        });
      }

      // 1. Find reservation
      const reservation = await Reservation.findById(id);

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found."
        });
      }

      // 2. Already collected check
      if (reservation.status === "COLLECTED") {
        return res.status(400).json({
          message: "Collection has already been confirmed for this reservation."
        });
      }

      // 3. If caller is RECIPIENT, verify authorization
      if (req.user.role === "RECIPIENT") {
        const isCreator =
          reservation.createdBy.toString() === req.user.id;
        const isSameOrg =
          req.user.organizationId &&
          reservation.recipientOrganizationId &&
          req.user.organizationId.toString() ===
            reservation.recipientOrganizationId.toString();

        if (!isCreator && !isSameOrg) {
          return res.status(403).json({
            message:
              "Access denied. You are not authorized to confirm collection for this reservation."
          });
        }
      }

      // 4. Ensure handover record exists before collection confirmation
      const handover = await Handover.findOne({ reservationId: id });
      if (!handover) {
        return res.status(400).json({
          message:
            "Cannot confirm collection before the donor has recorded the handover."
        });
      }

      // 5. Update reservation status to COLLECTED
      reservation.status = "COLLECTED";
      await reservation.save();

      // 6. Complete any associated volunteer assignment if not completed yet
      await VolunteerAssignment.updateMany(
        {
          reservationId: reservation._id,
          status: { $in: ["ASSIGNED", "ACCEPTED", "PICKED_UP"] }
        },
        {
          $set: {
            completedAt: new Date()
          }
        }
      );

      return res.status(200).json({
        message: "Collection confirmed successfully.",
        reservation,
        handover
      });
    } catch (error) {
      console.error("Collection confirmation error:", error);
      return res.status(500).json({
        message: "Could not confirm collection."
      });
    }
  }
);

module.exports = router;
