const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const { indexApprovedPolicy, PolicyNotApprovedError, PolicyNotFoundError } = require("../services/rag/policyIndexService");

const router = express.Router();
const documentIdSchema = z.string().trim().refine((id) => mongoose.Types.ObjectId.isValid(id), "Policy ID must be a valid MongoDB ObjectId.");

router.post("/:id/index", async (req, res, next) => {
  const parsed = documentIdSchema.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: "Policy ID must be a valid MongoDB ObjectId." });
  try {
    return res.status(200).json(await indexApprovedPolicy(parsed.data));
  } catch (error) {
    if (error instanceof PolicyNotFoundError) return res.status(404).json({ error: error.message });
    if (error instanceof PolicyNotApprovedError) return res.status(409).json({ error: error.message });
    return next(error);
  }
});

module.exports = router;
