/**
 * organizationMiddleware.js
 *
 * Reusable Express middleware factories for organization-level RBAC.
 *
 * These always run *after* authenticateToken so req.user is guaranteed.
 * They never trust an organizationId or role supplied by the client —
 * every check is made against the database.
 */

const mongoose = require("mongoose");
const Membership = require("../models/Membership");

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the organization ID from req.params.id or req.params.orgId.
 * Returns null if the value is missing or not a valid ObjectId.
 */
function extractOrgId(req) {
  const raw = req.params.id || req.params.orgId;
  if (!raw || !mongoose.isValidObjectId(raw)) {
    return null;
  }
  return raw;
}

/**
 * Look up the caller's active membership in an organization.
 * Returns the Membership document or null.
 */
async function getActiveMembership(userId, organizationId) {
  return Membership.findOne({
    userId,
    organizationId,
    status: "ACTIVE"
  });
}

// ─── middleware factories ────────────────────────────────────────────────────

/**
 * requireOrgMember
 *
 * Verifies the authenticated user has an ACTIVE membership in the
 * organization identified by :id in the route params.
 *
 * On success: attaches `req.membership` (the Membership document).
 * Also allows COORDINATOR platform-role users through (they may need
 * to view organization details for verification purposes).
 */
const requireOrgMember = async (req, res, next) => {
  try {
    const orgId = extractOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        message: "Invalid or missing organization ID."
      });
    }

    // COORDINATORs (Member 7's role) bypass membership checks.
    if (req.user.role === "COORDINATOR") {
      return next();
    }

    const membership = await getActiveMembership(req.user.id, orgId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not an active member of this organization."
      });
    }

    req.membership = membership;
    next();
  } catch (error) {
    console.error("requireOrgMember error:", error.message);
    return res.status(500).json({ message: "Authorization check failed." });
  }
};

/**
 * requireOrgAdmin
 *
 * Verifies the authenticated user has an ACTIVE ADMIN membership in the
 * organization identified by :id.
 *
 * On success: attaches `req.membership`.
 */
const requireOrgAdmin = async (req, res, next) => {
  try {
    const orgId = extractOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        message: "Invalid or missing organization ID."
      });
    }

    const membership = await Membership.findOne({
      userId: req.user.id,
      organizationId: orgId,
      role: "ADMIN",
      status: "ACTIVE"
    });

    if (!membership) {
      return res.status(403).json({
        message: "You must be an organization admin to perform this action."
      });
    }

    req.membership = membership;
    next();
  } catch (error) {
    console.error("requireOrgAdmin error:", error.message);
    return res.status(500).json({ message: "Authorization check failed." });
  }
};

/**
 * requireCoordinator
 *
 * Verifies the authenticated user holds the COORDINATOR platform role.
 * This is for verification-related operations owned by Member 7.
 */
const requireCoordinator = (req, res, next) => {
  if (req.user.role !== "COORDINATOR") {
    return res.status(403).json({
      message: "Access restricted to coordinators."
    });
  }
  next();
};

module.exports = {
  requireOrgMember,
  requireOrgAdmin,
  requireCoordinator
};
