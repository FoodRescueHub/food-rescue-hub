const express = require("express");
const Donation = require("../models/Donation");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// DONOR: Create a food donation
router.post(
  "/",
  authenticateToken,
  authorizeRoles("DONOR"),
  async (req, res) => {
    try {
      const {
        foodName,
        quantity,
        unit,
        description,
        pickupAddress,
        expiryDate
      } = req.body;

      if (
        typeof foodName !== "string" ||
        !foodName.trim() ||
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        typeof unit !== "string" ||
        !unit.trim() ||
        typeof pickupAddress !== "string" ||
        !pickupAddress.trim() ||
        !expiryDate
      ) {
        return res.status(400).json({
          message:
            "Please provide valid food, quantity, unit, pickup address and expiry date."
        });
      }

      const parsedExpiry = new Date(expiryDate);

      if (
        Number.isNaN(parsedExpiry.getTime()) ||
        parsedExpiry <= new Date()
      ) {
        return res.status(400).json({
          message: "Expiry date must be a valid future date."
        });
      }

      const donation = await Donation.create({
        foodName: foodName.trim(),
        quantity,
        unit: unit.trim(),
        description:
          typeof description === "string"
            ? description.trim()
            : "",
        pickupAddress: pickupAddress.trim(),
        expiryDate: parsedExpiry,
        donor: req.user.id
      });

      return res.status(201).json({
        message: "Food donation created successfully",
        donation
      });
    } catch (error) {
      console.error(
        "Create donation error:",
        error.message
      );

      return res.status(500).json({
        message: "Unable to create donation"
      });
    }
  }
);

// Both roles: View available food donations
router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const donations = await Donation.find({
        status: "AVAILABLE",
        expiryDate: { $gt: new Date() }
      })
        .populate("donor", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        count: donations.length,
        donations
      });
    } catch (error) {
      console.error(
        "List donations error:",
        error.message
      );

      return res.status(500).json({
        message: "Unable to retrieve donations"
      });
    }
  }
);

// DONOR: View only their own donations
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("DONOR"),
  async (req, res) => {
    try {
      const donations = await Donation.find({
        donor: req.user.id
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        count: donations.length,
        donations
      });
    } catch (error) {
      console.error(
        "My donations error:",
        error.message
      );

      return res.status(500).json({
        message: "Unable to retrieve your donations"
      });
    }
  }
);

// DONOR: Cancel only their own donation
router.patch(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("DONOR"),
  async (req, res) => {
    try {
      const donation = await Donation.findOne({
        _id: req.params.id,
        donor: req.user.id
      });

      if (!donation) {
        return res.status(404).json({
          message: "Donation not found"
        });
      }

      if (donation.status !== "AVAILABLE") {
        return res.status(400).json({
          message:
            "Only available donations can be cancelled"
        });
      }

      donation.status = "CANCELLED";

      await donation.save();

      return res.status(200).json({
        message: "Donation cancelled successfully",
        donation
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid donation ID"
        });
      }

      console.error(
        "Cancel donation error:",
        error.message
      );

      return res.status(500).json({
        message: "Unable to cancel donation"
      });
    }
  }
);

module.exports = router;