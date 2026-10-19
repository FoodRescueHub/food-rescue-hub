
function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function evaluateDonationMatch(donation, need) {
  const reasons = [];

  const donationFood = normalize(donation.foodType);
  const needFood = normalize(need.foodType);

  const foodMatches =
    donationFood.length > 0 &&
    needFood.length > 0 &&
    (donationFood.includes(needFood) ||
      needFood.includes(donationFood));

  if (!foodMatches) {
    reasons.push("Food type does not match");
  }

  const donationUnit = normalize(donation.unit);
  const needUnit = normalize(need.unit);
  const unitsMatch =
    donationUnit.length > 0 && donationUnit === needUnit;

  if (!unitsMatch) {
    reasons.push("Units do not match");
  }

  const donationQuantity = Number(donation.quantity);
  const needQuantity = Number(need.quantity);

  const quantitySufficient =
    Number.isFinite(donationQuantity) &&
    Number.isFinite(needQuantity) &&
    donationQuantity >= needQuantity;

  if (!quantitySufficient) {
    reasons.push("Insufficient quantity");
  }

  const donationAllergens = Array.isArray(donation.allergens)
    ? donation.allergens.map(normalize)
    : [];

  const requiredAllergens = Array.isArray(need.allergens)
    ? need.allergens.map(normalize)
    : [];

  const allergenReviewRequired = requiredAllergens.some(
    (allergen) => donationAllergens.includes(allergen)
  );

  if (allergenReviewRequired) {
    reasons.push("Allergen compatibility requires manual review");
  }

  return {
    matches:
      foodMatches &&
      unitsMatch &&
      quantitySufficient &&
      !allergenReviewRequired,
    foodMatches,
    unitsMatch,
    quantitySufficient,
    allergenReviewRequired,
    reasons,
  };
}

module.exports = { evaluateDonationMatch };
