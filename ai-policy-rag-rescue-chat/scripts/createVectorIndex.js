import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { PolicyChunk } from "../src/models/Chunk.js";

const indexName = "approved_policy_chunks";
const definition = {
  fields: [
    { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" },
    { type: "filter", path: "metadata.documentStatus" }
  ]
};

try {
  await connectToDatabase();
  const existing = await PolicyChunk.collection.listSearchIndexes(indexName).toArray();

  if (existing.length > 0) {
    console.log(`Vector index '${indexName}' already exists.`);
  } else {
    await PolicyChunk.collection.createSearchIndex({
      name: indexName,
      type: "vectorSearch",
      definition
    });
    console.log(`Creating vector index '${indexName}'.`);
  }
} finally {
  await disconnectFromDatabase();
}
