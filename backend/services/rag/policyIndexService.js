const PolicyChunk = require("../../models/Chunk");
const PolicyDocument = require("../../models/Document");
const mongoose = require("mongoose");
const { getRagConfig } = require("../../config/rag");
const { createEmbeddingModel } = require("./ollama");

class PolicyNotFoundError extends Error {}
class PolicyNotApprovedError extends Error {}

async function indexApprovedPolicy(documentId) {
  let document = await PolicyDocument.findById(documentId);

  // Member 7's coordinator module stores the source policy as HandlingPolicy.
  // Mirror only an approved source into the RAG document collection before indexing.
  if (!document) {
    const handlingPolicy = await mongoose.connection
      .collection("handlingpolicies")
      .findOne({ _id: new mongoose.Types.ObjectId(documentId) });

    if (handlingPolicy) {
      document = await PolicyDocument.findOneAndUpdate(
        { _id: handlingPolicy._id },
        {
          title: handlingPolicy.title,
          content: handlingPolicy.content,
          version: handlingPolicy.version,
          status: handlingPolicy.status,
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }
  }
  if (!document) throw new PolicyNotFoundError("Policy document was not found.");
  if (document.status !== "APPROVED") {
    throw new PolicyNotApprovedError("Only approved policy documents can be indexed.");
  }

  const { RecursiveCharacterTextSplitter } = await import("@langchain/textsplitters");
  const config = getRagConfig();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.CHUNK_SIZE,
    chunkOverlap: config.CHUNK_OVERLAP,
  });
  const contents = await splitter.splitText(document.content);
  const embeddings = await (await createEmbeddingModel()).embedDocuments(contents);
  if (embeddings.length !== contents.length) {
    throw new Error("Embedding service returned an unexpected number of vectors.");
  }

  const chunks = contents.map((content, chunkIndex) => ({
    documentId: document._id,
    content,
    embedding: embeddings[chunkIndex],
    metadata: {
      chunkIndex,
      documentStatus: document.status,
      documentTitle: document.title,
      documentVersion: document.version,
      sourceOwner: "Coordinator-approved HandlingPolicy record",
    },
  }));

  await PolicyChunk.deleteMany({ documentId: document._id });
  await PolicyChunk.insertMany(chunks);
  return { documentId: document.id, title: document.title, version: document.version, chunksIndexed: chunks.length };
}

module.exports = { indexApprovedPolicy, PolicyNotFoundError, PolicyNotApprovedError };
