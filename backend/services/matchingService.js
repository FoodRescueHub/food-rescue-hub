const mongoose = require("mongoose");
const { OllamaEmbeddings } = require("@langchain/ollama");

const Donation = require("../models/Donation");
const Need = require("../models/Need");
const User = require("../models/User");
const { proposeAllocations } = require("./matchingLogic");

let embeddings;

function getEmbeddings() {
  if (!embeddings) {
    embeddings = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    });
  }
  return embeddings;
}

function donationText(donation) {
  return [
    `Food: ${donation.foodName || ""}.`,
    `Description: ${donation.description || ""}.`,
    `Unit: ${donation.unit || ""}.`
  ].join(" ");
}

async function createDonationEmbedding(donation) {
  return getEmbeddings().embedQuery(donationText(donation));
}

async function searchDonationVectors(need, now) {
  const query = [
    `Recipient needs ${need.quantity} ${need.unit} of ${need.foodType}.`,
    need.pickupZone ? `Pickup area: ${need.pickupZone}.` : ""
  ].filter(Boolean).join(" ");
  const queryVector = await getEmbeddings().embedQuery(query);
  const index = process.env.MONGODB_VECTOR_INDEX_NAME || "donations_vector_index";
  const configuredLimit = Number(process.env.MATCHING_MAX_CANDIDATES);
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0
    ? Math.min(configuredLimit, 100)
    : 50;

  return Donation.aggregate([
    {
      $vectorSearch: {
        index,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(limit * 10, 100),
        limit,
        filter: {
          status: "AVAILABLE",
          expiryDate: { $gt: now },
          quantity: { $gt: 0 }
        }
      }
    },
    { $addFields: { semanticScore: { $meta: "vectorSearchScore" } } },
    { $project: { embedding: 0 } }
  ]);
}

async function searchMatchingProposals({ needId, recipientId, now = new Date() }) {
  if (!mongoose.isValidObjectId(needId) || !mongoose.isValidObjectId(recipientId)) {
    const error = new Error("A valid need ID is required.");
    error.status = 400;
    throw error;
  }

  const recipient = await User.findById(recipientId).select("organizationId role").lean();
  if (!recipient || recipient.role !== "RECIPIENT" || !recipient.organizationId) {
    const error = new Error("Recipient organization was not found.");
    error.status = 404;
    throw error;
  }

  const need = await Need.findOne({
    _id: needId,
    organizationId: recipient.organizationId,
    status: "ACTIVE",
    pickupEnd: { $gt: now }
  }).lean();
  if (!need) {
    const error = new Error("Active need not found for this organization.");
    error.status = 404;
    throw error;
  }

  let donations;
  try {
    donations = await searchDonationVectors(need, now);
  } catch (cause) {
    const error = new Error(
      "Semantic matching is unavailable. Check Ollama and the Atlas vector index configuration."
    );
    error.status = 503;
    error.cause = cause;
    throw error;
  }

  const allocation = proposeAllocations(need, donations, now);
  return {
    needId: String(need._id),
    requestedFood: need.foodType,
    requestedQuantity: need.quantity,
    requestedUnit: need.unit,
    ...allocation,
    requiresCoordinatorReview: true,
    proposalsOnly: true,
    message: "These are proposals only. Review compatibility before creating reservations."
  };
}

module.exports = { createDonationEmbedding, searchMatchingProposals };
