/**
 * organizations.js — routes mounted at /api/organizations
 *
 * POST   /                  Create an organization (any authenticated user).
 * GET    /my                List the caller's active-membership organizations.
 * GET    /:id               Get organization details (active member or coordinator).
 * PATCH  /:id               Update profile fields (organization ADMIN only).
 * GET    /:id/verification  Get verification status/notes (active member or coordinator).
 */

const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const Organization = require("../models/Organization");
const Membership = require("../models/Membership");
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");
const {
  requireOrgMember,
  requireOrgAdmin
} = require("../middleware/organizationMiddleware");

const router = express.Router();

// ─── validation schemas ──────────────────────────────────────────────────────

const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(1).max(60).optional(),
  address: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  servingCapacity: z.number().int().min(0).optional(),
  servingZones: z.array(z.string().trim().min(1)).max(20).optional(),
  operatingHours: z.string().trim().max(200).optional()
});

const updateOrgSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  type: z.string().trim().min(1).max(60).optional(),
  address: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  servingCapacity: z.number().int().min(0).optional(),
  servingZones: z.array(z.string().trim().min(1)).max(20).optional(),
  operatingHours: z.string().trim().max(200).optional()
});

// Fields that clients must never be able to set through profile update.
const PROTECTED_FIELDS = [
  "verificationStatus",
  "verificationNotes",
  "verifiedBy",
  "verifiedAt",
  "rejectionReason",
  "documents"
];

// ─── POST / — create organization ───────────────────────────────────────────

router.post("/", authenticateToken, async (req, res) => {
  // Declared outside the try block so the catch block can reference it for
  // compensating cleanup. Null means the Organization document was never
  // written, so there is nothing to roll back.
  let newOrg = null;

  try {
    const result = createOrgSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid organization details.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const {
      name,
      type,
      address,
      contactEmail,
      contactPhone,
      description,
      servingCapacity,
      servingZones,
      operatingHours
    } = result.data;

    // verificationStatus is always PENDING — never from the client.
    newOrg = await Organization.create({
      name,
      type: type || "RECIPIENT",
      address: address || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
      description: description || "",
      servingCapacity: servingCapacity != null ? servingCapacity : null,
      servingZones: servingZones || [],
      operatingHours: operatingHours || "",
      verificationStatus: "PENDING"
    });

    // Create an ADMIN membership for the creator.
    // Use upsert so a duplicate key race doesn't crash; just retrieve existing.
    await Membership.updateOne(
      {
        userId: req.user.id,
        organizationId: newOrg._id
      },
      {
        $setOnInsert: {
          userId: req.user.id,
          organizationId: newOrg._id,
          role: "ADMIN",
          status: "ACTIVE",
          joinedAt: new Date(),
          invitedBy: null
        }
      },
      { upsert: true }
    );

    // Stamp User.organizationId so existing routes (needs.js, reservations.js)
    // that resolve the org via User.organizationId work immediately after
    // registration without requiring a new login.
    // The $set is conditional: only fires when organizationId is currently null,
    // so an existing org association is never silently overwritten.
    await User.findOneAndUpdate(
      { _id: req.user.id, organizationId: null },
      { $set: { organizationId: newOrg._id } }
    );

    return res.status(201).json({
      message: "Organization created successfully.",
      organization: newOrg
    });
  } catch (error) {
    if (newOrg !== null) {
      const cleanupResults = await Promise.allSettled([
        User.updateOne(
          { _id: req.user.id, organizationId: newOrg._id },
          { $set: { organizationId: null } }
        ),
        Membership.deleteOne({
          userId: req.user.id,
          organizationId: newOrg._id
        }),
        Organization.deleteOne({ _id: newOrg._id })
      ]);

      cleanupResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Organization creation cleanup step ${index + 1} failed:`,
            result.reason
          );
        }
      });
    }

    console.error("Create organization error:", error.message);
    return res.status(500).json({ message: "Could not create organization." });
  }
});

// ─── GET /my — caller's active-membership organizations ─────────────────────

router.get("/my", authenticateToken, async (req, res) => {
  try {
    const memberships = await Membership.find({
      userId: req.user.id,
      status: "ACTIVE"
    }).lean();

    if (memberships.length === 0) {
      return res.status(200).json({ count: 0, organizations: [] });
    }

    const orgIds = memberships.map((m) => m.organizationId);
    const organizations = await Organization.find({
      _id: { $in: orgIds }
    }).lean();

    // Attach the caller's role in each organization.
    const membershipByOrg = {};
    for (const m of memberships) {
      membershipByOrg[m.organizationId.toString()] = m;
    }

    const result = organizations.map((org) => ({
      ...org,
      membershipRole: membershipByOrg[org._id.toString()]?.role || null
    }));

    return res.status(200).json({ count: result.length, organizations: result });
  } catch (error) {
    console.error("Get my organizations error:", error.message);
    return res.status(500).json({ message: "Could not fetch organizations." });
  }
});

// ─── GET /:id — organization details ────────────────────────────────────────

router.get("/:id", authenticateToken, requireOrgMember, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).lean();

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    return res.status(200).json({ organization });
  } catch (error) {
    console.error("Get organization error:", error.message);
    return res.status(500).json({ message: "Could not fetch organization." });
  }
});

// ─── PATCH /:id — update profile (ADMIN only) ───────────────────────────────

router.patch("/:id", authenticateToken, requireOrgAdmin, async (req, res) => {
  try {
    // Reject any attempt to modify verification or document fields.
    const attempted = Object.keys(req.body);
    const forbidden = attempted.filter((k) => PROTECTED_FIELDS.includes(k));

    if (forbidden.length > 0) {
      return res.status(400).json({
        message: `These fields cannot be changed through this endpoint: ${forbidden.join(", ")}.`
      });
    }

    const result = updateOrgSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid update data.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    if (Object.keys(result.data).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { $set: result.data },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    return res.status(200).json({
      message: "Organization updated successfully.",
      organization
    });
  } catch (error) {
    console.error("Update organization error:", error.message);
    return res.status(500).json({ message: "Could not update organization." });
  }
});

// ─── GET /:id/verification — verification status ─────────────────────────────

router.get(
  "/:id/verification",
  authenticateToken,
  requireOrgMember,
  async (req, res) => {
    try {
      const organization = await Organization.findById(req.params.id)
        .select("name verificationStatus verificationNotes verifiedAt rejectionReason")
        .lean();

      if (!organization) {
        return res.status(404).json({ message: "Organization not found." });
      }

      return res.status(200).json({
        organizationId: organization._id,
        name: organization.name,
        verificationStatus: organization.verificationStatus,
        verificationNotes: organization.verificationNotes || "",
        verifiedAt: organization.verifiedAt || null,
        rejectionReason: organization.rejectionReason || ""
      });
    } catch (error) {
      console.error("Get verification status error:", error.message);
      return res.status(500).json({ message: "Could not fetch verification status." });
    }
  }
);

module.exports = router;
