```javascript
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

  const unitsMatch = normalize(need.unit) === normalize(donation.unit);

  const quantitySufficient =
    unitsMatch && Number(donation.quantity) >= Number(need.quantity);

  const allergensNeedReview =
    Array.isArray(need.allergenRequirements) &&
    need.allergenRequirements.length > 0;

  const reasons = [];

  if (!foodMatches) reasons.push("Food type needs manual review.");
  if (!unitsMatch) reasons.push("Quantity units do not match.");
  else if (!quantitySufficient) {
    reasons.push("Donation quantity is insufficient.");
  }

  if (allergensNeedReview) {
    reasons.push("Allergen requirements need human verification.");
  }

  if (foodMatches && unitsMatch && quantitySufficient) {
    reasons.push("Food type, unit, and quantity match.");
  }

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
    reasons
  };
}

async function generateCollectionPlan(needId, recipientId) {
  if (
    !mongoose.isValidObjectId(needId) ||
    !mongoose.isValidObjectId(recipientId)
  ) {
    const error = new Error("Valid need and recipient IDs are required.");
    error.status = 400;
    throw error;
  }

  const recipient = await User.findById(recipientId);

  if (!recipient || !recipient.organizationId) {
    const error = new Error("Recipient organization was not found.");
    error.status = 404;
    throw error;
  }

  const now = new Date();

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

  const donations = await Donation.find({
    status: "AVAILABLE",
    expiryDate: { $gt: now }
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
      ...evaluateDonationMatch(need, donation)
    }))
    .sort((a, b) => {
      if (a.recommended !== b.recommended) {
        return Number(b.recommended) - Number(a.recommended);
      }
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });

  return {
    needId: need._id,
    requestedFood: need.foodType,
    requestedQuantity: need.quantity,
    requestedUnit: need.unit,
    recommendationCount: recommendations.length,
    recommendations,
    requiresCoordinatorReview: true,
    message:
      "Recommendations are suggestions only. Verify food safety and pickup details before arranging collection."
  };
}

module.exports = {
  generateCollectionPlan,
  evaluateDonationMatch
};
```
