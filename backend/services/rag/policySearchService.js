const PolicyChunk = require("../../models/Chunk");
const { getRagConfig } = require("../../config/rag");
const { createEmbeddingModel } = require("./ollama");

async function findApprovedPolicyChunks(question) {
  const config = getRagConfig();
  const queryVector = await (await createEmbeddingModel()).embedQuery(question);
  const chunks = await PolicyChunk.aggregate([
    {
      $vectorSearch: {
        index: "approved_policy_chunks",
        path: "embedding",
        queryVector,
        numCandidates: Math.max(config.RAG_TOP_K * 10, 40),
        limit: config.RAG_TOP_K,
        filter: { "metadata.documentStatus": "APPROVED" },
      },
    },
    { $project: { content: 1, metadata: 1, score: { $meta: "vectorSearchScore" } } },
  ]);
  return chunks.filter((chunk) => chunk.score >= config.RAG_SCORE_THRESHOLD);
}

module.exports = { findApprovedPolicyChunks };
