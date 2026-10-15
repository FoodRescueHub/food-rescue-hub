```javascript
const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  generateCollectionPlan
} = require("../services/collectionAgentService");

const router = express.Router();

router.get(
  "/:needId/plan",
  authenticateToken,
  authorizeRoles("RECIPIENT"),
  async (req, res) => {
    try {
      const plan = await generateCollectionPlan(
        req.params.needId,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error("Collection Agent error:", error.message);

      return res.status(error.status || 500).json({
        success: false,
        message:
          error.status && error.status < 500
            ? error.message
            : "Unable to generate the collection plan."
      });
    }
  }
);

module.exports = router;
```
