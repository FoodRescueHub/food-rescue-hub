const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateCandidate, proposeAllocations } = require("../services/matchingLogic");
const { now, need, listing } = require("./fixtures/matchingFixtures");

test("proposes a need split across compatible listings without reserving inventory", () => {
  const candidates = [listing("donor-a", 20), listing("donor-b", 15)];
  const result = proposeAllocations(need, candidates, now);

  assert.deepEqual(result.proposals.map(({ donationId, quantity }) => ({ donationId, quantity })), [
    { donationId: "donor-a", quantity: 20 },
    { donationId: "donor-b", quantity: 10 }
  ]);
  assert.equal(result.proposedQuantity, 30);
  assert.equal(result.remainingQuantity, 0);
  assert.equal(result.fullyMatched, true);
  assert.ok(result.proposals.every((proposal) =>
    proposal.quantity <= candidates.find(({ _id }) => _id === proposal.donationId).quantity
  ));
  assert.deepEqual(candidates.map(({ quantity }) => quantity), [20, 15]);
});

test("rejects unavailable, expired, insufficient-unit, and pickup-incompatible listings", () => {
  const candidates = [
    listing("claimed", 40, { status: "CLAIMED" }),
    listing("expired", 40, { expiryDate: new Date("2029-12-31T23:00:00Z") }),
    listing("wrong-unit", 40, { unit: "kg" }),
    listing("wrong-window", 40, {
      pickupStart: new Date("2030-01-02T10:00:00Z"),
      pickupEnd: new Date("2030-01-02T12:00:00Z")
    })
  ];
  const result = proposeAllocations(need, candidates, now);

  assert.equal(result.proposals.length, 0);
  assert.deepEqual(result.rejected.map((candidate) => candidate.reasons[0]), [
    "listing_unavailable",
    "listing_expired",
    "unit_mismatch",
    "pickup_window_incompatible"
  ]);
});

test("rejects a donor pickup window that has already ended", () => {
  const result = evaluateCandidate(need, listing("past-window", 40, {
    pickupStart: new Date("2029-12-31T20:00:00Z"),
    pickupEnd: new Date("2029-12-31T23:00:00Z")
  }), now);

  assert.equal(result.compatible, false);
  assert.ok(result.reasons.includes("pickup_window_expired"));
});

test("accepts a future donor pickup window that overlaps the requested window", () => {
  const result = evaluateCandidate(need, listing("future-overlap", 40, {
    pickupStart: new Date("2030-01-01T11:00:00Z"),
    pickupEnd: new Date("2030-01-01T13:00:00Z")
  }), now);

  assert.equal(result.compatible, true);
  assert.deepEqual(result.reasons, []);
});

test("treats missing allergen data as UNKNOWN and rejects it", () => {
  const result = evaluateCandidate(need, listing("unknown-allergens", 40, {
    allergenInfoStatus: undefined,
    allergens: undefined
  }), now);

  assert.equal(result.compatible, false);
  assert.equal(result.allergenStatus, "UNKNOWN");
  assert.ok(result.reasons.includes("allergen_information_unknown"));
});

test("rejects a declared allergen conflict and accepts known clear allergen data", () => {
  const unsafe = evaluateCandidate(need, listing("unsafe", 40, {
    allergens: ["peanut"]
  }), now);
  const safe = evaluateCandidate(need, listing("known-clear", 40), now);

  assert.ok(unsafe.reasons.includes("allergen_conflict"));
  assert.equal(unsafe.compatible, false);
  assert.equal(safe.compatible, true);
});
