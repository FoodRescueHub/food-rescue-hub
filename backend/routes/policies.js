const express = require("express");
const mongoose = require("mongoose");

const HandlingPolicy = require("../models/HandlingPolicy");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const ALLOWED_STATUSES = ["DRAFT", "APPROVED", "ARCHIVED"];

// =====================================================
// POST /api/policies - Create a new policy draft
// Coordinator only
// =====================================================
router.post(
  ["/policies", "/"],
  authenticateToken,
  authorizeRoles("COORDINATOR"),
  async (req, res) => {
    try {
      const { title, version, content } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof version !== "string" ||
        !version.trim() ||
        typeof content !== "string" ||
        !content.trim()
      ) {
        return res.status(400).json({
          message: "Please provide a valid title, version, and content."
        });
      }

      const policy = await HandlingPolicy.create({
        title: title.trim(),
        version: version.trim(),
        content: content.trim(),
        status: "DRAFT", // New policies must always start as DRAFT
        createdBy: req.user.id,
        approvedBy: null
      });

      return res.status(201).json({
        message: "Policy draft created successfully.",
        policy
      });
    } catch (error) {
      console.error("Policy creation error:", error);
      return res.status(500).json({
        message: "Could not create policy draft."
      });
    }
  }
);

// =====================================================
// GET /api/policies - List policies
// Coordinators see all (or filtered); others see only APPROVED (for RAG)
// =====================================================
router.get(["/policies", "/"], authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "COORDINATOR") {
      // Coordinators can optionally filter by status in query (?status=APPROVED)
      if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
        query.status = req.query.status;
      }
    } else {
      // Non-coordinators (including Member 9 RAG consumers) can ONLY retrieve APPROVED policies
      query.status = "APPROVED";
    }

    const policies = await HandlingPolicy.find(query)
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      count: policies.length,
      policies
    });
  } catch (error) {
    console.error("Policy fetch error:", error);
    return res.status(500).json({
      message: "Could not fetch policies."
    });
  }
});

// =====================================================
// PATCH /api/policies/:id - Edit policy
// Coordinator only
// =====================================================
router.patch(
  ["/policies/:id", "/:id"],
  authenticateToken,
  authorizeRoles("COORDINATOR"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, version, content, status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid policy ID."
        });
      }

      const policy = await HandlingPolicy.findById(id);

      if (!policy) {
        return res.status(404).json({
          message: "Policy not found."
        });
      }

      if (typeof title === "string" && title.trim()) {
        policy.title = title.trim();
      }

      if (typeof version === "string" && version.trim()) {
        policy.version = version.trim();
      }

      if (typeof content === "string" && content.trim()) {
        policy.content = content.trim();
      }

      if (status) {
        if (!ALLOWED_STATUSES.includes(status)) {
          return res.status(400).json({
            message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}.`
          });
        }
        if (status === "APPROVED") {
          // Setting status to APPROVED must track the approving coordinator
          policy.status = "APPROVED";
          policy.approvedBy = req.user.id;
        } else {
          policy.status = status;
        }
      }

      await policy.save();

      return res.status(200).json({
        message: "Policy updated successfully.",
        policy
      });
    } catch (error) {
      console.error("Policy update error:", error);
      return res.status(500).json({
        message: "Could not update policy."
      });
    }
  }
);

// =====================================================
// POST /api/policies/:id/approve - Approve a policy
// Coordinator only (changes status to APPROVED & sets approvedBy)
// =====================================================
router.post(
  ["/policies/:id/approve", "/:id/approve"],
  authenticateToken,
  authorizeRoles("COORDINATOR"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid policy ID."
        });
      }

      const policy = await HandlingPolicy.findById(id);

      if (!policy) {
        return res.status(404).json({
          message: "Policy not found."
        });
      }

      policy.status = "APPROVED";
      policy.approvedBy = req.user.id;

      await policy.save();

      return res.status(200).json({
        message: "Policy approved successfully.",
        policy
      });
    } catch (error) {
      console.error("Policy approve error:", error);
      return res.status(500).json({
        message: "Could not approve policy."
      });
    }
  }
);

module.exports = router;
