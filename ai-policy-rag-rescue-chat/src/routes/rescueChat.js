import express from "express";
import { z } from "zod";
import { answerRescueQuestion } from "../services/rescueChatService.js";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(1_500)
});

export const rescueChatRouter = express.Router();

rescueChatRouter.post("/", async (request, response, next) => {
  const parsedBody = requestSchema.safeParse(request.body);

  if (!parsedBody.success) {
    return response.status(400).json({
      error: "question must be a string between 3 and 1500 characters."
    });
  }

  try {
    return response.status(200).json(await answerRescueQuestion(parsedBody.data.question));
  } catch (error) {
    return next(error);
  }
});
