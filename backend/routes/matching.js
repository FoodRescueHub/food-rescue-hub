const express = require("express");
const { z } = require("zod");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { searchMatchingProposals } = require("../services/matchingService");

const router = express.Router();
const searchSchema = z.object({
  needId: z.string().trim().min(1)
});

router.post(
  "/search",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid matching search request.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    try {
      const result = await searchMatchingProposals({
        needId: parsed.data.needId,
        recipientId: req.user.id
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Matching search error:", error.message);
      return res.status(error.status || 500).json({
        success: false,
        message: error.status && error.status < 500
          ? error.message
          : error.status === 503
            ? error.message
            : "Unable to search for compatible food proposals."
      });
    }
  }
);

module.exports = router;
