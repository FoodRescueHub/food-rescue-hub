/**
 * memberships.js — routes mounted at /api/memberships
 *
 * GET    /organizations/:id/members           List members (active member or coordinator).
 * POST   /organizations/:id/members           Invite a user by email (ADMIN only).
 * PATCH  /organizations/:id/members/:userId   Update a member's role or status (ADMIN only).
 * DELETE /organizations/:id/members/:userId   Remove a member (ADMIN only).
 */

const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const Membership = require("../models/Membership");
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");
const {
  requireOrgMember,
  requireOrgAdmin
} = require("../middleware/organizationMiddleware");

const router = express.Router({ mergeParams: true });

// ─── validation schemas ──────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER")
});

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "LEFT"]).optional()
}).refine(
  (data) => data.role !== undefined || data.status !== undefined,
  { message: "Provide at least one of: role, status." }
);

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Count the number of active ADMINs in an organization.
 * Used to protect against removing the last admin.
 */
async function countActiveAdmins(organizationId) {
  return Membership.countDocuments({
    organizationId,
    role: "ADMIN",
    status: "ACTIVE"
  });
}

/**
 * Strip sensitive fields from a User document before returning it.
 */
function safeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

// ─── GET /organizations/:id/members ──────────────────────────────────────────

router.get(
  "/organizations/:id/members",
  authenticateToken,
  requireOrgMember,
  async (req, res) => {
    try {
      const memberships = await Membership.find({
        organizationId: req.params.id,
        status: { $in: ["ACTIVE", "INVITED"] }
      })
        .populate("userId", "name email role")
        .populate("invitedBy", "name email")
        .lean();

      const members = memberships.map((m) => ({
        membershipId: m._id,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy
          ? { _id: m.invitedBy._id, name: m.invitedBy.name, email: m.invitedBy.email }
          : null,
        user: safeUser(m.userId)
      }));

      return res.status(200).json({ count: members.length, members });
    } catch (error) {
      console.error("List members error:", error.message);
      return res.status(500).json({ message: "Could not fetch members." });
    }
  }
);

// ─── POST /organizations/:id/members — invite by email ───────────────────────

router.post(
  "/organizations/:id/members",
  authenticateToken,
  requireOrgAdmin,
  async (req, res) => {
    try {
      const result = inviteSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid invite details.",
          errors: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const { email, role } = result.data;

      // Look up the user — never auto-create accounts or leak whether an email
      // exists by returning different errors for "not found" vs other failures.
      const targetUser = await User.findOne({
        email: email.toLowerCase()
      }).lean();

      if (!targetUser) {
        return res.status(404).json({
          message: "No registered account found with that email address."
        });
      }

      // Guard: do not let users self-assign COORDINATOR through membership.
      if (role === "COORDINATOR") {
        return res.status(400).json({
          message: "The COORDINATOR role cannot be assigned through membership."
        });
      }

      // Check for an existing active or invited membership.
      const existing = await Membership.findOne({
        userId: targetUser._id,
        organizationId: req.params.id,
        status: { $in: ["ACTIVE", "INVITED"] }
      });

      if (existing) {
        return res.status(409).json({
          message: "This user already has an active or pending membership in this organization."
        });
      }

      const membership = await Membership.create({
        userId: targetUser._id,
        organizationId: req.params.id,
        role,
        status: "INVITED",
        joinedAt: null,
        invitedBy: req.user.id
      });

      return res.status(201).json({
        message: "Invitation created successfully.",
        membership: {
          membershipId: membership._id,
          role: membership.role,
          status: membership.status,
          invitedUser: safeUser(targetUser)
        }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "This user already has a membership record in this organization."
        });
      }
      console.error("Invite member error:", error.message);
      return res.status(500).json({ message: "Could not create invitation." });
    }
  }
);

// ─── PATCH /organizations/:id/members/:userId — update role or status ────────

router.patch(
  "/organizations/:id/members/:userId",
  authenticateToken,
  requireOrgAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      const result = updateMemberSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid update data.",
          errors: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const { role, status } = result.data;

      // Find the target membership.
      const membership = await Membership.findOne({
        userId,
        organizationId: req.params.id
      });

      if (!membership) {
        return res.status(404).json({
          message: "Membership not found in this organization."
        });
      }

      // Last-admin protection: prevent demoting or suspending if this is the
      // only active ADMIN and the change would remove their admin status.
      const removingAdminStatus =
        (role !== undefined && role !== "ADMIN" && membership.role === "ADMIN") ||
        (status !== undefined &&
          status !== "ACTIVE" &&
          membership.role === "ADMIN" &&
          membership.status === "ACTIVE");

      if (removingAdminStatus) {
        const adminCount = await countActiveAdmins(req.params.id);

        if (adminCount <= 1) {
          return res.status(400).json({
            message:
              "Cannot change this membership: the organization must have at least one active admin."
          });
        }
      }

      if (role !== undefined) membership.role = role;
      if (status !== undefined) {
        membership.status = status;
        // Set joinedAt when an invitation is accepted (INVITED → ACTIVE).
        if (status === "ACTIVE" && membership.joinedAt == null) {
          membership.joinedAt = new Date();
        }
      }

      await membership.save();

      return res.status(200).json({
        message: "Membership updated successfully.",
        membership: {
          membershipId: membership._id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt
        }
      });
    } catch (error) {
      console.error("Update membership error:", error.message);
      return res.status(500).json({ message: "Could not update membership." });
    }
  }
);

// ─── DELETE /organizations/:id/members/:userId — remove member ───────────────

router.delete(
  "/organizations/:id/members/:userId",
  authenticateToken,
  requireOrgAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }

      const membership = await Membership.findOne({
        userId,
        organizationId: req.params.id,
        status: { $in: ["ACTIVE", "INVITED", "SUSPENDED"] }
      });

      if (!membership) {
        return res.status(404).json({
          message: "Active membership not found in this organization."
        });
      }

      // Last-admin protection.
      if (membership.role === "ADMIN" && membership.status === "ACTIVE") {
        const adminCount = await countActiveAdmins(req.params.id);

        if (adminCount <= 1) {
          return res.status(400).json({
            message:
              "Cannot remove this member: the organization must have at least one active admin."
          });
        }
      }

      // Mark LEFT rather than hard-delete to preserve the audit trail.
      membership.status = "LEFT";
      await membership.save();

      return res.status(200).json({
        message: "Member removed from organization.",
        membershipId: membership._id
      });
    } catch (error) {
      console.error("Remove member error:", error.message);
      return res.status(500).json({ message: "Could not remove member." });
    }
  }
);

module.exports = router;
