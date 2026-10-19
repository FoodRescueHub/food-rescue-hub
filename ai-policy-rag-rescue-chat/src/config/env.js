import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  OLLAMA_BASE_URL: z.url().default("http://127.0.0.1:11434"),
  OLLAMA_CHAT_MODEL: z.string().min(1).default("llama3.2:3b"),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default("nomic-embed-text"),
  RAG_TOP_K: z.coerce.number().int().min(1).max(10).default(4),
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  CHUNK_SIZE: z.coerce.number().int().min(100).max(4000).default(800),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).max(1000).default(150)
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment configuration:", parsedEnvironment.error.flatten().fieldErrors);
  throw new Error("Cannot start without valid environment configuration.");
}

export const env = parsedEnvironment.data;
