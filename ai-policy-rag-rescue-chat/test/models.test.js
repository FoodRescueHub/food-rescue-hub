import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { PolicyChunk } from "../src/models/Chunk.js";
import { PolicyDocument } from "../src/models/Document.js";

test("PolicyDocument accepts an approved policy", async () => {
  const document = new PolicyDocument({
    title: "Community Food Handling Policy",
    content: "Approved coordinators must document each pickup.",
    version: "v2",
    status: "APPROVED"
  });

  await assert.doesNotReject(document.validate());
});

test("PolicyDocument rejects an unknown status", async () => {
  const document = new PolicyDocument({
    title: "Draft policy",
    content: "Example policy content.",
    version: "v1",
    status: "published"
  });

  await assert.rejects(document.validate(), { name: "ValidationError" });
});

test("PolicyChunk requires a finite embedding vector", async () => {
  const chunk = new PolicyChunk({
    documentId: new mongoose.Types.ObjectId(),
    content: "Document each pickup.",
    embedding: [0.1, 0.2, 0.3],
    metadata: {
      documentStatus: "approved",
      documentTitle: "Community Food Handling Policy",
      documentVersion: "v2"
    }
  });

  await assert.doesNotReject(chunk.validate());
});

test("PolicyChunk rejects an empty embedding vector", async () => {
  const chunk = new PolicyChunk({
    documentId: new mongoose.Types.ObjectId(),
    content: "Document each pickup.",
    embedding: [],
    metadata: {}
  });

  await assert.rejects(chunk.validate(), { name: "ValidationError" });
});
