const test = require("node:test");
const assert = require("node:assert/strict");

const Donation = require("../models/Donation");
const { buildDonationVectorSearchPipeline } = require("../services/matchingService");

test("Donation model uses the donations collection without time-series options", () => {
  assert.equal(Donation.collection.collectionName, "donations");
  assert.equal(Donation.schema.options.timeseries, undefined);
  assert.ok(Donation.schema.path("embedding"));
});

test("builds direct Atlas Vector Search on the donation embedding and availability fields", () => {
  const now = new Date("2030-01-01T00:00:00.000Z");
  const pipeline = buildDonationVectorSearchPipeline({
    queryVector: [0.1, 0.2],
    index: "donations_vector_index",
    limit: 25,
    now
  });

  assert.deepEqual(pipeline[0].$vectorSearch, {
    index: "donations_vector_index",
    path: "embedding",
    queryVector: [0.1, 0.2],
    numCandidates: 250,
    limit: 25,
    filter: {
      status: "AVAILABLE",
      expiryDate: { $gt: now },
      quantity: { $gt: 0 }
    }
  });
  assert.deepEqual(pipeline[2], { $project: { embedding: 0 } });
});