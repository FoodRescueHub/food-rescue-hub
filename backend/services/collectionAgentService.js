
const Need = require("../models/Need");
const Donation = require("../models/Donation");
const {
  readNeeds,
  findAvailableLots,
  checkPickupCapacity,
} = require("./collectionAgentTools");

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getAllergenWarnings(donation) {
  return [
    "Allergen information is UNKNOWN. Verify ingredients and cross-contact risks before approval.",
    ...(donation.description
      ? []
      : ["Donation description is missing."]),
  ];
}

function evaluateDonationMatch(need, donation) {
  const warnings = [];
  const needFood = normalize(need.foodType);
  const donationFood = normalize(
    donation.foodName || donation.description
  );

  const needUnit = normalize(need.unit);
  const donationUnit = normalize(donation.unit);

  if (!needFood || !donationFood || needFood !== donationFood) {
    warnings.push("Food type does not exactly match the need.");
  }

  if (needUnit !== donationUnit) {
    warnings.push("Units do not match; automatic quantity conversion is unavailable.");
  }

  const quantity = Number(donation.quantity);
  const expiryDate = new Date(donation.expiryDate);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    warnings.push("Donation quantity is invalid.");
  }

  if (
    !donation.expiryDate ||
    Number.isNaN(expiryDate.getTime()) ||
    expiryDate <= new Date()
  ) {
    warnings.push("Donation is expired or has no valid expiry date.");
  }

  warnings.push(...getAllergenWarnings(donation));

  return {
    matches:
      warnings.every(
        (warning) =>
          !warning.startsWith("Food type") &&
          !warning.startsWith("Units do not match") &&
          !warning.startsWith("Donation quantity") &&
          !warning.startsWith("Donation is expired")
      ),
    foodTypeMatch: Boolean(needFood && donationFood && needFood === donationFood),
    unitMatch: Boolean(needUnit && donationUnit && needUnit === donationUnit),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
    warnings,
    allergenStatus: "UNKNOWN",
    requiresCoordinatorReview: true,
  };
}

function buildCombinedPlan(need, donations) {
  const requestedQuantity = Number(need.quantity);
  const requestedUnit = normalize(need.unit);

  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return {
      selectedDonations: [],
      requestedQuantity: need.quantity,
      requestedUnit: need.unit,
      allocatedQuantity: 0,
      remainingQuantity: need.quantity,
      warnings: ["Requested need quantity is invalid."],
      requiresCoordinatorReview: true,
    };
  }

  let remaining = requestedQuantity;
  const selectedDonations = [];
  const warnings = [];

  const sortedDonations = [...donations].sort(
    (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
  );

  for (const donation of sortedDonations) {
    if (remaining <= 0) break;

    const match = evaluateDonationMatch(need, donation);

    if (!match.foodTypeMatch || !match.unitMatch || match.quantity <= 0) {
      warnings.push(
        `${donation.foodName || "Donation"} was not selected because its food type, unit, or quantity needs review.`
      );
      continue;
    }

    if (
      !donation.expiryDate ||
      new Date(donation.expiryDate) <= new Date()
    ) {
      warnings.push(
        `${donation.foodName || "Donation"} was not selected because its expiry date is invalid or past.`
      );
      continue;
    }

    const allocatedQuantity = Math.min(match.quantity, remaining);

    selectedDonations.push({
      donationId: String(donation._id),
      foodName: donation.foodName,
      availableQuantity: match.quantity,
      allocatedQuantity,
      unit: donation.unit,
      pickupAddress: donation.pickupAddress,
      expiryDate: donation.expiryDate,
      allergenStatus: "UNKNOWN",
      reviewReason: match.warnings,
      requiresCoordinatorReview: true,
    });

    remaining -= allocatedQuantity;
  }

  if (remaining > 0) {
    warnings.push(
      `The plan is short by ${remaining} ${requestedUnit || "units"}.`
    );
  }

  warnings.push(
    "This is a proposal only. No donations are reserved or changed."
  );

  return {
    requestedQuantity,
    requestedUnit: need.unit,
    selectedDonations,
    allocatedQuantity: requestedQuantity - remaining,
    remainingQuantity: remaining,
    warnings,
    requiresCoordinatorReview: true,
    inventoryChanged: false,
    proposalOnly: true,
  };
}

async function generateCollectionPlan(needId, organizationId) {
  const need = await Need.findById(needId).lean();

  if (!need) {
    throw new Error("Food need not found.");
  }

  if (
    organizationId &&
    String(need.organizationId) !== String(organizationId)
  ) {
    throw new Error("You are not authorized to access this food need.");
  }

  if (need.status !== "ACTIVE") {
    throw new Error("Only active food needs can have a collection plan.");
  }

  const now = new Date();
  const pickupStart =
    need.pickupStart && new Date(need.pickupStart) > now
      ? new Date(need.pickupStart)
      : now;

  const pickupEnd =
    need.pickupEnd && new Date(need.pickupEnd) > pickupStart
      ? new Date(need.pickupEnd)
      : new Date(pickupStart.getTime() + 60 * 60 * 1000);

  const needs = organizationId
    ? await readNeeds(organizationId)
    : [need];

  const availableLots = await findAvailableLots({
    start: pickupStart,
    end: pickupEnd,
  });

  const plan = buildCombinedPlan(need, availableLots);

  return {
    needId: String(need._id),
    foodType: need.foodType,
    organizationId: String(need.organizationId),
    requestedQuantity: plan.requestedQuantity,
    requestedUnit: plan.requestedUnit,
    allocatedQuantity: plan.allocatedQuantity,
    remainingQuantity: plan.remainingQuantity,
    selectedDonations: plan.selectedDonations,
    combinedPlan: plan,
    otherActiveNeedsCount: needs.length,
    proposalOnly: true,
    inventoryChanged: false,
    requiresCoordinatorReview: true,
    travelStatus: "UNVERIFIED",
    volunteerCapacityStatus: "UNVERIFIED",
    warnings: [
      ...plan.warnings,
      "Travel estimates are not configured.",
      "Donor pickup availability must be confirmed.",
      "Volunteer capacity must be confirmed.",
      "Coordinator approval is required before any reservation.",
    ],
  };
}

module.exports = {
  generateCollectionPlan,
  evaluateDonationMatch,
  buildCombinedPlan,
  readNeeds,
  findAvailableLots,
  checkPickupCapacity,
};
