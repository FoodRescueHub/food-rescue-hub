import { env } from "../config/env.js";
import { PolicyChunk } from "../models/Chunk.js";
import { createEmbeddingModel } from "./ollama.js";

const VECTOR_INDEX_NAME = "approved_policy_chunks";

export async function findApprovedPolicyChunks(question) {
  const queryVector = await createEmbeddingModel().embedQuery(question);
  const chunks = await PolicyChunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(env.RAG_TOP_K * 10, 40),
        limit: env.RAG_TOP_K,
        filter: { "metadata.documentStatus": "APPROVED" }
      }
    },
    {
      $project: {
        content: 1,
        metadata: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ]);

  return chunks.filter((chunk) => chunk.score >= env.RAG_SCORE_THRESHOLD);
}
