const express = require("express");
const mongoose = require("mongoose");

const Reservation = require("../models/Reservation");
const Donation = require("../models/Donation");
const Need = require("../models/Need");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const HOLD_MINUTES = 15;

// =====================================================
// CREATE RESERVATION
// =====================================================

router.post(
  "/surplus/:id/reservations",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { needId, quantity } = req.body;

      if (
        !mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(needId)
      ) {
        return res.status(400).json({
          message: "Invalid donation or need ID.",
        });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than zero.",
        });
      }

      const donation = await Donation.findOneAndUpdate(
        {
          _id: id,
          status: "AVAILABLE",
          expiryDate: { $gt: new Date() },
          donor: { $ne: req.user.id },
          quantity: { $gte: quantity },
        },
        {
          $inc: {
            quantity: -quantity,
          },
        },
        {
          new: true,
        }
      );

      if (!donation) {
        return res.status(400).json({
          message:
            "Donation is unavailable or has insufficient quantity.",
        });
      }

      try {
        const need = await Need.findOne({
          _id: needId,
          status: "ACTIVE",
          organizationId: req.user.organizationId,
          quantity: { $gte: quantity },
        });

        if (!need) {
          await Donation.updateOne(
            { _id: donation._id },
            {
              $inc: {
                quantity: quantity,
              },
            }
          );

          return res.status(400).json({
            message:
              "Active need not found or quantity is insufficient.",
          });
        }

        const reservation = await Reservation.create({
          surplusLotId: donation._id,
          needId: need._id,
          recipientOrganizationId: need.organizationId,
          quantity: quantity,
          status: "HELD",
          expiresAt: new Date(
            Date.now() + HOLD_MINUTES * 60 * 1000
          ),
          createdBy: req.user.id,
        });

        return res.status(201).json({
          message: "Reservation created successfully.",
          reservation,
          remainingQuantity: donation.quantity,
        });
      } catch (error) {
        await Donation.updateOne(
          { _id: donation._id },
          {
            $inc: {
              quantity: quantity,
            },
          }
        );

        throw error;
      }
    } catch (error) {
      console.error("Reservation create error:", error);

      return res.status(500).json({
        message: "Could not create reservation.",
      });
    }
  }
);

// =====================================================
// GET MY RESERVATIONS
// =====================================================

router.get(
  "/reservations",
  authenticateToken,
  async (req, res) => {
    try {
      const reservations = await Reservation.find({
        createdBy: req.user.id,
      })
        .populate(
          "needId",
          "foodType quantity pickupZone status"
        )
        .sort({
          createdAt: -1,
        });

      const reservationsWithFood = await Promise.all(
        reservations.map(async (reservation) => {
          const donation = await Donation.findById(
            reservation.surplusLotId
          ).select(
            "foodName description pickupAddress expiryDate quantity status"
          );

          return {
            ...reservation.toObject(),
            surplusLotId: donation || null,
          };
        })
      );

      return res.status(200).json({
        count: reservationsWithFood.length,
        reservations: reservationsWithFood,
      });
    } catch (error) {
      console.error("Reservation fetch error:", error);

      return res.status(500).json({
        message: "Could not fetch reservations.",
      });
    }
  }
);

// =====================================================
// GET SINGLE RESERVATION
// =====================================================

router.get(
  "/reservations/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid reservation ID.",
        });
      }

      const reservation = await Reservation.findOne({
        _id: id,
        createdBy: req.user.id,
      });

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found.",
        });
      }

      return res.status(200).json({
        reservation,
      });
    } catch (error) {
      console.error("Reservation detail error:", error);

      return res.status(500).json({
        message: "Could not fetch reservation.",
      });
    }
  }
);

// =====================================================
// CONFIRM RESERVATION
// =====================================================

router.post(
  "/reservations/:id/confirm",
  authenticateToken,
  async (req, res) => {
    try {
      const reservation = await Reservation.findOneAndUpdate(
        {
          _id: req.params.id,
          createdBy: req.user.id,
          status: "HELD",
          expiresAt: {
            $gt: new Date(),
          },
        },
        {
          $set: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        },
        {
          new: true,
        }
      );

      if (!reservation) {
        return res.status(400).json({
          message: "Reservation cannot be confirmed.",
        });
      }

      return res.status(200).json({
        message: "Reservation confirmed.",
        reservation,
      });
    } catch (error) {
      console.error("Reservation confirm error:", error);

      return res.status(500).json({
        message: "Could not confirm reservation.",
      });
    }
  }
);

// =====================================================
// CANCEL RESERVATION
// =====================================================

router.post(
  "/reservations/:id/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      const reservation = await Reservation.findOneAndUpdate(
        {
          _id: req.params.id,
          createdBy: req.user.id,
          status: {
            $in: ["HELD", "CONFIRMED"],
          },
        },
        {
          $set: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        },
        {
          new: true,
        }
      );

      if (!reservation) {
        return res.status(400).json({
          message: "Reservation cannot be cancelled.",
        });
      }

      await Donation.updateOne(
        {
          _id: reservation.surplusLotId,
        },
        {
          $inc: {
            quantity: reservation.quantity,
          },
        }
      );

      return res.status(200).json({
        message: "Reservation cancelled.",
        reservation,
      });
    } catch (error) {
      console.error("Reservation cancel error:", error);

      return res.status(500).json({
        message: "Could not cancel reservation.",
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================
// AUTO-EXPIRE HELD RESERVATIONS
async function expireReservations() {
  try {
    const expiredReservations = await Reservation.find({
      status: "HELD",
      expiresAt: {
        $lte: new Date(),
      },
    });

    for (const reservation of expiredReservations) {
      const updatedReservation = await Reservation.findOneAndUpdate(
        {
          _id: reservation._id,
          status: "HELD",
        },
        {
          $set: {
            status: "EXPIRED",
          },
        },
        {
          new: true,
        }
      );

      if (updatedReservation) {
        await Donation.updateOne(
          {
            _id: reservation.surplusLotId,
          },
          {
            $inc: {
              quantity: reservation.quantity,
            },
          }
        );

        console.log(
          `Reservation ${reservation._id} expired. Restored quantity: ${reservation.quantity}`
        );
      }
    }
  } catch (error) {
    console.error("Reservation expiry error:", error);
  }
}

// Check every minute for expired reservations
setInterval(expireReservations, 60 * 1000);

// Also check once when server starts
expireReservations();
module.exports = router;