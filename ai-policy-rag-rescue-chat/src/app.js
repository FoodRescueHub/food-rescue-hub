import express from "express";
import { policiesRouter } from "./routes/policies.js";
import { rescueChatRouter } from "./routes/rescueChat.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/api/policies", policiesRouter);
app.use("/api/rescue-chat", rescueChatRouter);

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Request body must be valid JSON." });
  }

  console.error("Unhandled request error:", error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});
