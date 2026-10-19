
const express = require("express");
const mongoose = require("mongoose");

const Need = require("../models/Need");
const User = require("../models/User");
const Membership = require("../models/Membership");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Resolve the recipient's organization only when their membership is active.
async function getRecipient(req) {
  if (!mongoose.isValidObjectId(req.user.id)) {
    return null;
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return null;
  }

  // A stored organization association is usable only with an active membership.
  const membership = await Membership.findOne({
    userId: user._id,
    ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    status: "ACTIVE"
  });

  if (!membership) {
    return null;
  }

  if (!user.organizationId) {
    await User.updateOne(
      { _id: user._id, organizationId: null },
      { $set: { organizationId: membership.organizationId } }
    );
    user.organizationId = membership.organizationId;
  }

  return user;
}

// POST /api/needs
// Create a new food need.
router.post(
  "/",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const {
        foodType,
        quantity,
        unit,
        allergenRequirements,
        pickupStart,
        pickupEnd,
        pickupZone
      } = req.body;

      if (
        typeof foodType !== "string" ||
        !foodType.trim() ||
        typeof unit !== "string" ||
        !unit.trim() ||
        typeof pickupZone !== "string" ||
        !pickupZone.trim()
      ) {
        return res.status(400).json({
          message: "Food type, unit, and pickup zone are required."
        });
      }

      if (
        typeof quantity !== "number" ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Quantity must be a positive number."
        });
      }

      if (
        allergenRequirements !== undefined &&
        (!Array.isArray(allergenRequirements) ||
          !allergenRequirements.every(
            item => typeof item === "string"
          ))
      ) {
        return res.status(400).json({
          message: "Allergen requirements must be a list of strings."
        });
      }

      const start = new Date(pickupStart);
      const end = new Date(pickupEnd);

      if (
        !pickupStart ||
        !pickupEnd ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return res.status(400).json({
          message: "Provide a valid pickup window. End must be after start."
        });
      }

      const user = await getRecipient(req);

      if (!user) {
        return res.status(403).json({
          message: "Your account must belong to an organization."
        });
      }

      const need = await Need.create({
        organizationId: user.organizationId,
        createdBy: user._id,
        foodType: foodType.trim(),
        quantity,
        unit: unit.trim(),
        allergenRequirements: allergenRequirements || [],
        pickupStart: start,
        pickupEnd: end,
        pickupZone: pickupZone.trim()
      });

      return res.status(201).json({
        message: "Food need created successfully.",
        need
      });
    } catch (error) {
      console.error("Create need error:", error);

      return res.status(500).json({
        message: "Could not create food need."
      });
    }
  }
);

// GET /api/needs
// List needs belonging to the recipient's organization.
router.get(
  "/",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const user = await getRecipient(req);

      if (!user) {
        return res.status(403).json({
          message: "Your account must belong to an organization."
        });
      }

      const needs = await Need.find({
        organizationId: user.organizationId
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        count: needs.length,
        needs
      });
    } catch (error) {
      console.error("Fetch needs error:", error);

      return res.status(500).json({
        message: "Could not fetch food needs."
      });
    }
  }
);

// GET /api/needs/:id
// View one need belonging to the recipient's organization.
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid need ID."
        });
      }

      const user = await getRecipient(req);

      if (!user) {
        return res.status(403).json({
          message: "Your account must belong to an organization."
        });
      }

      const need = await Need.findOne({
        _id: req.params.id,
        organizationId: user.organizationId
      });

      if (!need) {
        return res.status(404).json({
          message: "Need not found."
        });
      }

      return res.status(200).json({ need });
    } catch (error) {
      console.error("Fetch need error:", error);

      return res.status(500).json({
        message: "Could not fetch food need."
      });
    }
  }
);

// PATCH /api/needs/:id
// Update or cancel a need belonging to the recipient's organization.
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid need ID."
        });
      }

      const user = await getRecipient(req);

      if (!user) {
        return res.status(403).json({
          message: "Your account must belong to an organization."
        });
      }

      const need = await Need.findOne({
        _id: req.params.id,
        organizationId: user.organizationId
      });

      if (!need) {
        return res.status(404).json({
          message: "Need not found."
        });
      }

      const allowedFields = [
        "foodType",
        "quantity",
        "unit",
        "allergenRequirements",
        "pickupStart",
        "pickupEnd",
        "pickupZone"
      ];

      const suppliedFields = Object.keys(req.body);

      if (
        suppliedFields.length === 0 ||
        suppliedFields.some(field => !allowedFields.includes(field) &&
          field !== "status")
      ) {
        return res.status(400).json({
          message: "Invalid or missing update fields."
        });
      }

      if (req.body.status !== undefined) {
        if (req.body.status !== "CANCELLED") {
          return res.status(400).json({
            message: "Only cancellation is allowed through this route."
          });
        }

        need.status = "CANCELLED";
      } else {
        if (need.status !== "ACTIVE") {
          return res.status(400).json({
            message: "Only active needs can be edited."
          });
        }

        if (
          req.body.foodType !== undefined &&
          (typeof req.body.foodType !== "string" ||
            !req.body.foodType.trim())
        ) {
          return res.status(400).json({
            message: "Food type cannot be empty."
          });
        }

        if (
          req.body.unit !== undefined &&
          (typeof req.body.unit !== "string" ||
            !req.body.unit.trim())
        ) {
          return res.status(400).json({
            message: "Unit cannot be empty."
          });
        }

        if (
          req.body.pickupZone !== undefined &&
          (typeof req.body.pickupZone !== "string" ||
            !req.body.pickupZone.trim())
        ) {
          return res.status(400).json({
            message: "Pickup zone cannot be empty."
          });
        }

        if (
          req.body.quantity !== undefined &&
          (typeof req.body.quantity !== "number" ||
            !Number.isFinite(req.body.quantity) ||
            req.body.quantity <= 0)
        ) {
          return res.status(400).json({
            message: "Quantity must be a positive number."
          });
        }

        if (
          req.body.allergenRequirements !== undefined &&
          (!Array.isArray(req.body.allergenRequirements) ||
            !req.body.allergenRequirements.every(
              item => typeof item === "string"
            ))
        ) {
          return res.status(400).json({
            message: "Allergen requirements must be a list of strings."
          });
        }

        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            need[field] = req.body[field];
          }
        }

        if (req.body.foodType !== undefined) {
          need.foodType = req.body.foodType.trim();
        }

        if (req.body.unit !== undefined) {
          need.unit = req.body.unit.trim();
        }

        if (req.body.pickupZone !== undefined) {
          need.pickupZone = req.body.pickupZone.trim();
        }

        if (req.body.pickupStart !== undefined) {
          need.pickupStart = new Date(req.body.pickupStart);
        }

        if (req.body.pickupEnd !== undefined) {
          need.pickupEnd = new Date(req.body.pickupEnd);
        }

        if (
          Number.isNaN(new Date(need.pickupStart).getTime()) ||
          Number.isNaN(new Date(need.pickupEnd).getTime()) ||
          new Date(need.pickupEnd) <= new Date(need.pickupStart)
        ) {
          return res.status(400).json({
            message: "Provide a valid pickup window."
          });
        }
      }

      await need.save();

      return res.status(200).json({
        message: "Food need updated successfully.",
        need
      });
    } catch (error) {
      console.error("Update need error:", error);

      return res.status(500).json({
        message: "Could not update food need."
      });
    }
  }
);

module.exports = router;
