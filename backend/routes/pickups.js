const express = require("express");
const mongoose = require("mongoose");

const VolunteerAssignment = require("../models/VolunteerAssignment");
const Reservation = require("../models/Reservation");
const User = require("../models/User");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const ALLOWED_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "FAILED",
  "CANCELLED"
];

// =====================================================
// POST /api/pickups - Assign volunteer to a reservation
// Coordinator only
// =====================================================
router.post(
  "/",
  authenticateToken,
  authorizeRoles("COORDINATOR"),
  async (req, res) => {
    try {
      const { reservationId, volunteerId, pickupWindow, zone } = req.body;

      if (
        !mongoose.isValidObjectId(reservationId) ||
        !mongoose.isValidObjectId(volunteerId)
      ) {
        return res.status(400).json({
          message: "Valid reservationId and volunteerId are required."
        });
      }

      // 1. Verify reservation exists
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found."
        });
      }

      // 2. Reservation must be CONFIRMED before pickup assignment
      if (reservation.status !== "CONFIRMED") {
        return res.status(400).json({
          message: `Cannot assign pickup for reservation in "${reservation.status}" status. Reservation must be CONFIRMED.`
        });
      }

      // 3. Verify assigned user exists and has VOLUNTEER role
      const volunteer = await User.findById(volunteerId);
      if (!volunteer) {
        return res.status(404).json({
          message: "Volunteer user not found."
        });
      }

      if (volunteer.role !== "VOLUNTEER") {
        return res.status(400).json({
          message: "Assigned user must have the VOLUNTEER role."
        });
      }

      // 4. Check if an active assignment already exists for this reservation
      const existingAssignment = await VolunteerAssignment.findOne({
        reservationId,
        status: { $in: ["ASSIGNED", "ACCEPTED", "PICKED_UP"] }
      });

      if (existingAssignment) {
        return res.status(400).json({
          message:
            "An active pickup assignment already exists for this reservation."
        });
      }

      // 5. Create new volunteer assignment
      const assignment = await VolunteerAssignment.create({
        reservationId,
        volunteerId,
        assignedBy: req.user.id,
        status: "ASSIGNED",
        pickupWindow:
          typeof pickupWindow === "string" ? pickupWindow.trim() : "",
        zone: typeof zone === "string" ? zone.trim() : ""
      });

      return res.status(201).json({
        message: "Pickup assignment created successfully.",
        assignment
      });
    } catch (error) {
      console.error("Pickup assignment creation error:", error);
      return res.status(500).json({
        message: "Could not create pickup assignment."
      });
    }
  }
);

// =====================================================
// GET /api/pickups - List pickups
// Volunteers see their own; coordinators see all
// =====================================================
router.get("/", authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "VOLUNTEER") {
      query.volunteerId = req.user.id;
    } else if (req.user.role === "COORDINATOR") {
      // Coordinator sees all, or can filter by volunteerId or status if provided in query
      if (
        req.query.volunteerId &&
        mongoose.isValidObjectId(req.query.volunteerId)
      ) {
        query.volunteerId = req.query.volunteerId;
      }
      if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
        query.status = req.query.status;
      }
    } else {
      return res.status(403).json({
        message: "Access denied. Only volunteers and coordinators can list pickups."
      });
    }

    const assignments = await VolunteerAssignment.find(query)
      .populate({
        path: "reservationId",
        populate: [
          {
            path: "surplusLotId",
            select: "foodName description pickupAddress expiryDate quantity unit status donor"
          },
          {
            path: "needId",
            select: "foodType quantity unit pickupZone pickupStart pickupEnd status"
          }
        ]
      })
      .populate("volunteerId", "name email role")
      .populate("assignedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: assignments.length,
      assignments
    });
  } catch (error) {
    console.error("Pickup fetch list error:", error);
    return res.status(500).json({
      message: "Could not fetch pickup assignments."
    });
  }
});

// =====================================================
// GET /api/pickups/:id - Get pickup details
// Only assigned volunteer or coordinator
// =====================================================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid pickup assignment ID."
      });
    }

    const assignment = await VolunteerAssignment.findById(id)
      .populate({
        path: "reservationId",
        populate: [
          {
            path: "surplusLotId",
            select: "foodName description pickupAddress expiryDate quantity unit status donor"
          },
          {
            path: "needId",
            select: "foodType quantity unit pickupZone pickupStart pickupEnd status"
          },
          {
            path: "recipientOrganizationId",
            select: "name email role"
          },
          {
            path: "createdBy",
            select: "name email role"
          }
        ]
      })
      .populate("volunteerId", "name email role")
      .populate("assignedBy", "name email role");

    if (!assignment) {
      return res.status(404).json({
        message: "Pickup assignment not found."
      });
    }

    // Check authorization: must be the assigned volunteer or a coordinator
    const assignedVolunteerId = assignment.volunteerId
      ? assignment.volunteerId._id
        ? assignment.volunteerId._id.toString()
        : assignment.volunteerId.toString()
      : null;

    const isAssignedVolunteer = assignedVolunteerId === req.user.id;
    const isCoordinator = req.user.role === "COORDINATOR";

    if (!isAssignedVolunteer && !isCoordinator) {
      return res.status(403).json({
        message:
          "Access denied. Only the assigned volunteer or a coordinator can view these pickup details."
      });
    }

    return res.status(200).json({
      assignment
    });
  } catch (error) {
    console.error("Pickup fetch detail error:", error);
    return res.status(500).json({
      message: "Could not fetch pickup assignment details."
    });
  }
});

// =====================================================
// PATCH /api/pickups/:id - Update pickup status
// Assigned volunteer or coordinator
// =====================================================
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pickupWindow, zone } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid pickup assignment ID."
      });
    }

    const assignment = await VolunteerAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        message: "Pickup assignment not found."
      });
    }

    // Check authorization: must be the assigned volunteer or a coordinator
    const isAssignedVolunteer =
      assignment.volunteerId.toString() === req.user.id;
    const isCoordinator = req.user.role === "COORDINATOR";

    if (!isAssignedVolunteer && !isCoordinator) {
      return res.status(403).json({
        message:
          "Access denied. You do not have permission to update this pickup assignment."
      });
    }

    // Validate requested status
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}.`
      });
    }

    // Cannot update if assignment is already in a terminal state
    if (["FAILED", "CANCELLED"].includes(assignment.status)) {
      return res.status(400).json({
        message: `Cannot update assignment in "${assignment.status}" status.`
      });
    }

    // Role-specific transition rules
    if (status === "CANCELLED" && !isCoordinator) {
      return res.status(403).json({
        message: "Only coordinators can cancel a pickup assignment."
      });
    }

    if (status === "ACCEPTED") {
      if (assignment.status !== "ASSIGNED") {
        return res.status(400).json({
          message: `Cannot accept assignment currently in "${assignment.status}" status. Must be in "ASSIGNED" status.`
        });
      }
      assignment.acceptedAt = new Date();
    }

    if (status === "PICKED_UP") {
      if (assignment.status !== "ACCEPTED") {
        return res.status(400).json({
          message: `Cannot mark PICKED_UP from "${assignment.status}" status. Assignment must first be ACCEPTED.`
        });
      }
      assignment.completedAt = new Date();
    }

    if (status === "FAILED") {
      if (!["ASSIGNED", "ACCEPTED"].includes(assignment.status)) {
        return res.status(400).json({
          message: `Cannot mark assignment as FAILED from "${assignment.status}" status.`
        });
      }
    }

    assignment.status = status;

    // Optional coordinator metadata updates
    if (isCoordinator) {
      if (typeof pickupWindow === "string") {
        assignment.pickupWindow = pickupWindow.trim();
      }
      if (typeof zone === "string") {
        assignment.zone = zone.trim();
      }
    }

    await assignment.save();

    return res.status(200).json({
      message: `Pickup assignment status updated to ${status}.`,
      assignment
    });
  } catch (error) {
    console.error("Pickup update error:", error);
    return res.status(500).json({
      message: "Could not update pickup assignment."
    });
  }
});

module.exports = router;
