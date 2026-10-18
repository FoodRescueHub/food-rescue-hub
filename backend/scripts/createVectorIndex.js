require("dotenv").config();
const mongoose = require("mongoose");
const PolicyChunk = require("../models/Chunk");

const indexName = "approved_policy_chunks";
const definition = {
  fields: [
    { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" },
    { type: "filter", path: "metadata.documentStatus" },
  ],
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await PolicyChunk.collection.listSearchIndexes(indexName).toArray();
  if (existing.length) console.log(`Vector index '${indexName}' already exists.`);
  else {
    await PolicyChunk.collection.createSearchIndex({ name: indexName, type: "vectorSearch", definition });
    console.log(`Creating vector index '${indexName}'.`);
  }
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
