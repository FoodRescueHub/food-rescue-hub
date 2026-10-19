const ALLERGENS_UNKNOWN = "UNKNOWN";

function evaluateCandidate(need, donation, now = new Date()) {
  const reasons = [];
  const availableQuantity = Number(donation.quantity);
  const compatibleUnit =
    String(donation.unit || "").trim().toLowerCase() ===
    String(need.unit || "").trim().toLowerCase();

  if (donation.status !== "AVAILABLE") reasons.push("listing_unavailable");
  const expiryDate = donation.expiryDate && new Date(donation.expiryDate);
  if (!expiryDate || !Number.isFinite(expiryDate.getTime()) || expiryDate <= now) {
    reasons.push("listing_expired");
  }
  if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
    reasons.push("quantity_unavailable");
  }
  if (!compatibleUnit) reasons.push("unit_mismatch");

  const allergenStatus = donation.allergenInfoStatus === "KNOWN"
    ? "KNOWN"
    : ALLERGENS_UNKNOWN;
  const declaredAllergens = Array.isArray(donation.allergens)
    ? donation.allergens.map((value) => String(value).trim().toLowerCase())
    : null;

  if (allergenStatus !== "KNOWN" || declaredAllergens === null) {
    reasons.push("allergen_information_unknown");
  } else {
    const restricted = new Set(
      (Array.isArray(need.allergenRequirements) ? need.allergenRequirements : [])
        .map((value) => String(value).trim().toLowerCase())
    );
    const conflicts = declaredAllergens.filter((allergen) => restricted.has(allergen));
    if (conflicts.length > 0) reasons.push("allergen_conflict");
  }

  const pickupStart = donation.pickupStart && new Date(donation.pickupStart);
  const pickupEnd = donation.pickupEnd && new Date(donation.pickupEnd);
  const needStart = need.pickupStart && new Date(need.pickupStart);
  const needEnd = need.pickupEnd && new Date(need.pickupEnd);
  const validPickupWindow =
    pickupStart && pickupEnd && needStart && needEnd &&
    Number.isFinite(pickupStart.getTime()) &&
    Number.isFinite(pickupEnd.getTime()) &&
    Number.isFinite(needStart.getTime()) &&
    Number.isFinite(needEnd.getTime()) &&
    pickupStart < pickupEnd && needStart < needEnd;

  if (!validPickupWindow) {
    reasons.push("pickup_window_unknown");
  } else {
    if (pickupEnd <= now) reasons.push("pickup_window_expired");

    const sharedStart = new Date(Math.max(
      pickupStart.getTime(),
      needStart.getTime(),
      now.getTime()
    ));
    const sharedEnd = new Date(Math.min(
      pickupEnd.getTime(),
      needEnd.getTime()
    ));
    if (sharedStart >= sharedEnd) reasons.push("pickup_window_incompatible");
  }

  return {
    compatible: reasons.length === 0,
    reasons,
    allergenStatus,
    availableQuantity,
    compatibleUnit
  };
}

function proposeAllocations(need, rankedDonations, now = new Date()) {
  let remainingQuantity = Number(need.quantity);
  if (!Number.isFinite(remainingQuantity) || remainingQuantity <= 0) {
    throw new TypeError("Need quantity must be a positive number.");
  }

  const proposals = [];
  const rejected = [];

  for (const donation of rankedDonations) {
    const evaluation = evaluateCandidate(need, donation, now);
    if (!evaluation.compatible) {
      rejected.push({
        donationId: String(donation._id),
        reasons: evaluation.reasons,
        allergenStatus: evaluation.allergenStatus
      });
      continue;
    }
    if (remainingQuantity <= 0) break;

    const proposedQuantity = Math.min(remainingQuantity, evaluation.availableQuantity);
    proposals.push({
      donationId: String(donation._id),
      foodName: donation.foodName,
      quantity: proposedQuantity,
      unit: donation.unit,
      pickupAddress: donation.pickupAddress,
      pickupStart: donation.pickupStart,
      pickupEnd: donation.pickupEnd,
      expiryDate: donation.expiryDate,
      semanticScore: donation.semanticScore
    });
    remainingQuantity -= proposedQuantity;
  }

  return {
    proposals,
    rejected,
    requestedQuantity: Number(need.quantity),
    proposedQuantity: Number(need.quantity) - remainingQuantity,
    remainingQuantity,
    fullyMatched: remainingQuantity === 0
  };
}

module.exports = { ALLERGENS_UNKNOWN, evaluateCandidate, proposeAllocations };
