import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { env } from "../config/env.js";
import { PolicyChunk } from "../models/Chunk.js";
import { PolicyDocument } from "../models/Document.js";
import { createEmbeddingModel } from "./ollama.js";

export class PolicyNotFoundError extends Error {}
export class PolicyNotApprovedError extends Error {}

export async function indexApprovedPolicy(documentId) {
  const document = await PolicyDocument.findById(documentId);

  if (!document) {
    throw new PolicyNotFoundError("Policy document was not found.");
  }

  if (document.status !== "APPROVED") {
    throw new PolicyNotApprovedError("Only approved policy documents can be indexed.");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: env.CHUNK_SIZE,
    chunkOverlap: env.CHUNK_OVERLAP
  });
  const contents = await splitter.splitText(document.content);
  const embeddings = await createEmbeddingModel().embedDocuments(contents);

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
      sourceOwner: "Coordinator-approved HandlingPolicy record"
    }
  }));

  await PolicyChunk.deleteMany({ documentId: document._id });
  await PolicyChunk.insertMany(chunks);

  return {
    documentId: document.id,
    title: document.title,
    version: document.version,
    chunksIndexed: chunks.length
  };
}
