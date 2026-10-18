import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  indexApprovedPolicy,
  PolicyNotApprovedError,
  PolicyNotFoundError
} from "../services/policyIndexService.js";

export const documentIdSchema = z
  .string()
  .trim()
  .refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    "Policy ID must be a valid MongoDB ObjectId."
  );

export const policiesRouter = express.Router();

policiesRouter.post("/:id/index", async (request, response, next) => {
  const parsedId = documentIdSchema.safeParse(request.params.id);

  if (!parsedId.success) {
    return response.status(400).json({ error: "Policy ID must be a valid MongoDB ObjectId." });
  }

  try {
    const result = await indexApprovedPolicy(parsedId.data);
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof PolicyNotFoundError) {
      return response.status(404).json({ error: error.message });
    }

    if (error instanceof PolicyNotApprovedError) {
      return response.status(409).json({ error: error.message });
    }

    return next(error);
  }
});
