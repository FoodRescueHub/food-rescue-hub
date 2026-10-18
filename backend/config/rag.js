const { z } = require("zod");

const ragSchema = z.object({
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_CHAT_MODEL: z.string().min(1).default("llama3.2:3b"),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default("nomic-embed-text"),
  RAG_TOP_K: z.coerce.number().int().min(1).max(10).default(4),
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  CHUNK_SIZE: z.coerce.number().int().min(100).max(5000).default(800),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).max(1000).default(150),
});

function getRagConfig() {
  return ragSchema.parse(process.env);
}

module.exports = { getRagConfig };
