
const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Both DONOR and RECIPIENT can access this route
router.get(
  "/profile",
  authenticateToken,
  (req, res) => {
    res.status(200).json({
      message: "Profile accessed successfully",
      user: {
        id: req.user.id,
        role: req.user.role
      }
    });
  }
);

// Only DONOR can access this route
router.get(
  "/donor/dashboard",
  authenticateToken,
  authorizeRoles("DONOR"),
  (req, res) => {
    res.status(200).json({
      message: "Welcome to the Donor Dashboard",
      role: req.user.role
    });
  }
);

// Only RECIPIENT can access this route
router.get(
  "/recipient/dashboard",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  (req, res) => {
    res.status(200).json({
      message: "Welcome to the Recipient Dashboard",
      role: req.user.role
    });
  }
);

module.exports = router;
