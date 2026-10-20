/**
 * Authentication and Role-based Access Middleware
 *
 * Supports production session/token patterns as well as headers for testing/demonstration:
 * - x-user-id: Mock user ObjectId
 * - x-user-role: 'donor' | 'recipient' | 'coordinator' | 'volunteer'
 * - x-org-id: Mock Organization ObjectId
 * - x-user-verified: 'true' | 'false'
 */

// Helper to extract user identity from session, token or test headers
const resolveUserFromRequest = (req) => {
  // 1. Check session if available
  if (req.session && req.session.user) {
    return req.session.user;
  }

  // 2. Check development / mock header integration
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const orgId = req.headers['x-org-id'];
  const isVerifiedHeader = req.headers['x-user-verified'];

  if (userId) {
    return {
      _id: userId,
      id: userId,
      role: userRole || 'donor',
      organizationId: orgId || '65f000000000000000000001',
      isVerified: isVerifiedHeader !== undefined ? isVerifiedHeader === 'true' : true,
      email: req.headers['x-user-email'] || 'donor@testbakery.org'
    };
  }

  return null;
};

/**
 * Optional authentication: attaches req.user if present, but permits anonymous public requests
 */
const optionalAuth = (req, res, next) => {
  req.user = resolveUserFromRequest(req);
  next();
};

/**
 * Required authentication: rejects unauthenticated requests
 */
const requireAuth = (req, res, next) => {
  const user = resolveUserFromRequest(req);
  if (!user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in to perform this operation'
    });
  }
  req.user = user;
  next();
};

/**
 * Role-based authorization
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'No active session or identity found'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
      });
    }

    // Check organization approval requirement
    if (req.user.role === 'donor' && req.user.isVerified === false) {
      return res.status(403).json({
        error: 'Organization Not Verified',
        message: 'Your organization must be verified and approved by a platform coordinator before publishing or editing surplus listings'
      });
    }

    next();
  };
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  resolveUserFromRequest
};
