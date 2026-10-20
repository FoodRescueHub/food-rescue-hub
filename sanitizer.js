/**
 * Sanitizer utilities to enforce public privacy & data safety:
 * - Public users only receive sanitized availability summaries
 * - Excludes private addresses, direct phone numbers, and recipient/beneficiary identities
 * - Treats missing allergen info as UNKNOWN
 */

const sanitizeSurplusLot = (lot, viewerUser = null) => {
  if (!lot) return null;

  // Convert Mongoose document to plain object if needed
  const doc = lot.toObject ? lot.toObject({ virtuals: true }) : { ...lot };

  // Check if viewer has authorized access to private donor details:
  // - Platform coordinator
  // - The donor or staff member belonging to the same organization that created the lot
  const isAuthorizedOrgMember =
    viewerUser &&
    (viewerUser.role === 'coordinator' ||
      (viewerUser.role === 'donor' &&
        viewerUser.organizationId &&
        String(viewerUser.organizationId) === String(doc.organizationId)));

  if (isAuthorizedOrgMember) {
    // Return complete lot details including private pickup address
    return {
      id: doc._id || doc.id,
      organizationId: doc.organizationId,
      createdBy: doc.createdBy,
      title: doc.title,
      description: doc.description,
      quantity: doc.quantity,
      remainingQuantity: doc.remainingQuantity,
      unit: doc.unit,
      preparationInfo: doc.preparationInfo,
      storageInfo: doc.storageInfo,
      allergenInfo: normalizeAllergenInfo(doc.allergenInfo),
      pickupStart: doc.pickupStart,
      pickupEnd: doc.pickupEnd,
      pickupZone: doc.pickupZone,
      pickupAddress: doc.pickupAddress || null,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  // SANITIZED PUBLIC VIEW:
  // Strict privacy guarantee: Private street address, building, donor contact phone,
  // internal notes, and recipient identities are omitted.
  return {
    id: doc._id || doc.id,
    organizationId: doc.organizationId,
    title: doc.title,
    description: doc.description,
    quantity: doc.quantity,
    remainingQuantity: doc.remainingQuantity,
    unit: doc.unit,
    preparationInfo: doc.preparationInfo,
    storageInfo: doc.storageInfo,
    allergenInfo: normalizeAllergenInfo(doc.allergenInfo),
    pickupStart: doc.pickupStart,
    pickupEnd: doc.pickupEnd,
    pickupZone: doc.pickupZone, // only neighborhood / general pickup zone is public
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

/**
 * Normalizes allergen info, ensuring missing details are explicitly UNKNOWN and not allergen-free
 */
const normalizeAllergenInfo = (info) => {
  if (!info || typeof info !== 'object') {
    return {
      status: 'UNKNOWN',
      allergens: [],
      isAllergenFree: false,
      crossContaminationRisk: 'UNKNOWN',
      details: 'UNKNOWN - Missing allergen information. Not verified as allergen-free.'
    };
  }

  const status = info.status || (info.allergens && info.allergens.length > 0 ? 'CONTAINS' : 'UNKNOWN');
  return {
    status,
    allergens: Array.isArray(info.allergens) ? info.allergens : [],
    // Crucial safety check: if status is UNKNOWN, never mark as allergen-free
    isAllergenFree: status === 'UNKNOWN' ? false : Boolean(info.isAllergenFree),
    crossContaminationRisk: info.crossContaminationRisk || 'UNKNOWN',
    details: info.details || (status === 'UNKNOWN' ? 'UNKNOWN - Missing allergen information' : 'Specified by donor')
  };
};

module.exports = {
  sanitizeSurplusLot,
  normalizeAllergenInfo
};
