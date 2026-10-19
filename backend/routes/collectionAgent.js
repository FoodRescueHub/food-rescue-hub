const authenticateToken = require("../middleware/authMiddleware");
const express = require("express");
const { z } = require("zod");
const {
  generateCollectionPlan,
} = require("../services/collectionAgentService");

const router = express.Router();

const planSchema = z.object({
  needId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid need ID"),
});

router.post("/", async (req, res) => {
  try {
    const parsed = planSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "A valid needId is required.",
        errors: parsed.error.issues,
      });
    }

    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const plan = await generateCollectionPlan(
      parsed.data.needId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    const status = /not found/i.test(error.message)
      ? 404
      : /not authorized/i.test(error.message)
        ? 403
        : 400;

    return res.status(status).json({
      success: false,
      message: error.message || "Could not generate collection plan.",
    });
  }
});

module.exports = router;
