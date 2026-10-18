const express = require("express");
const { z } = require("zod");
const { answerRescueQuestion } = require("../services/rag/rescueChatService");

const router = express.Router();
const requestSchema = z.object({ question: z.string().trim().min(3).max(1500) });

router.post("/", async (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "question must be a string between 3 and 1500 characters." });
  try {
    return res.status(200).json(await answerRescueQuestion(parsed.data.question));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
