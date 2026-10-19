
const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const Need = require("../models/Need");
const User = require("../models/User");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function evaluateDonationMatch(need, donation) {
  const requestedFood = normalize(need.foodType);
  const donatedFood = normalize(donation.foodName);

  const foodMatches =
    Boolean(requestedFood && donatedFood) &&
    (requestedFood.includes(donatedFood) ||
      donatedFood.includes(requestedFood));

  const unitsMatch =
    normalize(need.unit) === normalize(donation.unit);

  const quantitySufficient =
    unitsMatch &&
    Number(donation.quantity) >= Number(need.quantity);

  const allergenRequirements =
    Array.isArray(need.allergenRequirements)
      ? need.allergenRequirements
      : [];

  // Donation schema currently has no allergen declaration.
  const allergensNeedReview = true;

  const reasons = [];

  if (!foodMatches) {
    reasons.push("Food type needs manual review.");
  }

  if (!unitsMatch) {
    reasons.push("Quantity units do not match.");
  } else if (!quantitySufficient) {
    reasons.push("Donation alone does not cover the full need.");
  }

  if (allergenRequirements.length > 0) {
    reasons.push("Need has allergen requirements.");
  }

  reasons.push(
    "Donation allergen information is unavailable; verify food safety."
  );

  return {
  
    recommended:
    foodMatches &&
    unitsMatch &&
    quantitySufficient &&
    !allergensNeedReview,
    needsReview:
      !foodMatches ||
      !unitsMatch ||
      !quantitySufficient ||
      allergensNeedReview,
    foodMatches,
    unitsMatch,
    quantitySufficient,
    allergensNeedReview,
    reasons,
  };
}

function buildCombinedPlan(need, donations) {
  const requestedQuantity = Number(need.quantity);

  const eligible = donations
    .filter((donation) => {
      const match = evaluateDonationMatch(need, donation);

      return (
        match.foodMatches &&
        match.unitsMatch &&
        Number(donation.quantity) > 0
      );
    })
    .sort(
      (a, b) =>
        new Date(a.expiryDate) - new Date(b.expiryDate)
    );

  let remaining = requestedQuantity;
  const selected = [];

  for (const donation of eligible) {
    if (remaining <= 0) break;

    const available = Number(donation.quantity);
    const allocated = Math.min(available, remaining);

    selected.push({
      donationId: donation._id,
      donorId: donation.donor,
      foodName: donation.foodName,
      availableQuantity: available,
      allocatedQuantity: allocated,
      unit: donation.unit,
      pickupAddress: donation.pickupAddress,
      expiryDate: donation.expiryDate,
      needsReview: true,
      reviewReason:
        "Confirm allergen information, food safety, and pickup feasibility.",
    });

    remaining -= allocated;
  }

  const allocatedQuantity =
    requestedQuantity - Math.max(remaining, 0);

  return {
    requestedQuantity,
    allocatedQuantity,
    remainingQuantity: Math.max(remaining, 0),
    unit: need.unit,
    fulfilledByProposal: remaining <= 0,
    selectedDonations: selected,
    requiresCoordinatorReview: true,
    inventoryChanged: false,
  };
}

async function generateCollectionPlan(needId, recipientId) {
  if (
    !mongoose.isValidObjectId(needId) ||
    !mongoose.isValidObjectId(recipientId)
  ) {
    const error = new Error(
      "Valid need and recipient IDs are required."
    );
    error.status = 400;
    throw error;
  }

  const recipient = await User.findById(recipientId).lean();

  if (!recipient || !recipient.organizationId) {
    const error = new Error(
      "Recipient organization was not found."
    );
    error.status = 404;
    throw error;
  }

  const now = new Date();

  const need = await Need.findOne({
    _id: needId,
    organizationId: recipient.organizationId,
    status: "ACTIVE",
    pickupEnd: { $gt: now },
  }).lean();

  if (!need) {
    const error = new Error(
      "Active need not found for this organization."
    );
    error.status = 404;
    throw error;
  }

  const donations = await Donation.find({
    status: "AVAILABLE",
    expiryDate: { $gt: now },
  })
    .sort({ expiryDate: 1 })
    .lean();

  const recommendations = donations
    .map((donation) => ({
      donationId: donation._id,
      foodName: donation.foodName,
      quantity: donation.quantity,
      unit: donation.unit,
      pickupAddress: donation.pickupAddress,
      expiryDate: donation.expiryDate,
      ...evaluateDonationMatch(need, donation),
    }))
    .sort((a, b) => {
      if (a.foodMatches !== b.foodMatches) {
        return Number(b.foodMatches) - Number(a.foodMatches);
      }

      if (a.unitsMatch !== b.unitsMatch) {
        return Number(b.unitsMatch) - Number(a.unitsMatch);
      }

      return (
        new Date(a.expiryDate) - new Date(b.expiryDate)
      );
    });

  const combinedPlan = buildCombinedPlan(need, donations);

  return {
    needId: need._id,
    requestedFood: need.foodType,
    requestedQuantity: need.quantity,
    requestedUnit: need.unit,
    recommendationCount: recommendations.length,
    recommendations,
    combinedPlan,
    requiresCoordinatorReview: true,
    message:
      "This is a proposal only. Verify food safety, allergen information, pickup windows, travel, and volunteer capacity before coordinator approval. No inventory is reserved or changed.",
  };
}

module.exports = {
  generateCollectionPlan,
  evaluateDonationMatch,
  buildCombinedPlan,
};
