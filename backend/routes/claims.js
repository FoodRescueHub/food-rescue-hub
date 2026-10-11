
const express = require("express");
const mongoose = require("mongoose");

const Claim = require("../models/Claim");
const Donation = require("../models/Donation");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// POST /api/claims/:donationId
// Allow a recipient to claim available food.
router.post(
  "/:donationId",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const { donationId } = req.params;

      if (!mongoose.isValidObjectId(donationId)) {
        return res.status(400).json({
          message: "Invalid donation ID.",
        });
      }

      // Atomically change AVAILABLE to CLAIMED.
      // This prevents two recipients from claiming it at once.
      const donation = await Donation.findOneAndUpdate(
        {
          _id: donationId,
          status: "AVAILABLE",
          expiryDate: { $gt: new Date() },
          donor: { $ne: req.user.id },
        },
        { $set: { status: "CLAIMED" } },
        { new: true }
      );

      if (!donation) {
        return res.status(400).json({
          message:
            "Donation is unavailable, expired, or belongs to you.",
        });
      }

      try {
        const claim = await Claim.create({
          donation: donation._id,
          recipient: req.user.id,
        });

        return res.status(201).json({
          message: "Food claimed successfully!",
          claim,
        });
      } catch (error) {
        // Restore availability if creating the claim fails.
        await Donation.updateOne(
          { _id: donation._id, status: "CLAIMED" },
          { $set: { status: "AVAILABLE" } }
        );

        throw error;
      }
    } catch (error) {
      console.error("Claim error:", error);

      return res.status(500).json({
        message: "Could not claim food. Please try again.",
      });
    }
  }
);

// GET /api/claims/my
// View the logged-in recipient's claims.
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const claims = await Claim.find({
        recipient: req.user.id,
      })
        .populate("donation")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        count: claims.length,
        claims,
      });
    } catch (error) {
      console.error("Fetch claims error:", error);

      return res.status(500).json({
        message: "Could not fetch your claims.",
      });
    }
  }
);

module.exports = router;
