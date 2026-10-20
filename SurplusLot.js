const mongoose = require('mongoose');

/**
 * Valid Status values for a Surplus Lot:
 * - AVAILABLE: Lot is posted and fully available for reservation
 * - PARTIALLY_RESERVED: Portion of the quantity is reserved, some remains
 * - FULLY_RESERVED: All quantities have been claimed/reserved
 * - EXPIRED: Pickup window has closed (pickupEnd < now)
 * - CANCELLED: Donor or platform coordinator cancelled the listing
 */
const SURPLUS_STATUS = {
  AVAILABLE: 'AVAILABLE',
  PARTIALLY_RESERVED: 'PARTIALLY_RESERVED',
  FULLY_RESERVED: 'FULLY_RESERVED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

const allergenSubSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['UNKNOWN', 'SPECIFIED', 'CONTAINS', 'NONE_DECLARED'],
      default: 'UNKNOWN',
      required: true
    },
    allergens: {
      type: [String],
      default: []
    },
    isAllergenFree: {
      type: Boolean,
      default: false // CRITICAL: NEVER assume food is allergen-free
    },
    crossContaminationRisk: {
      type: String,
      enum: ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'],
      default: 'UNKNOWN'
    },
    details: {
      type: String,
      default: 'UNKNOWN - Donor has not supplied allergen specifications. Must be treated as UNKNOWN.'
    }
  },
  { _id: false }
);

const surplusLotSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'organizationId is required'],
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
      default: function () {
        return this.quantity;
      }
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required (e.g. portions, kg, boxes, servings)'],
      trim: true
    },
    preparationInfo: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Preparation information is required'],
      validate: {
        validator: function (val) {
          if (!val) return false;
          if (typeof val === 'string') return val.trim().length > 0;
          if (typeof val === 'object') return Object.keys(val).length > 0;
          return false;
        },
        message: 'Preparation information must supply preparation details'
      }
    },
    storageInfo: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Storage information is required'],
      validate: {
        validator: function (val) {
          if (!val) return false;
          if (typeof val === 'string') return val.trim().length > 0;
          if (typeof val === 'object') return Object.keys(val).length > 0;
          return false;
        },
        message: 'Storage information must supply storage and temperature requirements'
      }
    },
    allergenInfo: {
      type: allergenSubSchema,
      required: true,
      default: () => ({
        status: 'UNKNOWN',
        allergens: [],
        isAllergenFree: false,
        crossContaminationRisk: 'UNKNOWN',
        details: 'UNKNOWN - Missing allergen information. Must not be assumed allergen-free.'
      })
    },
    pickupStart: {
      type: Date,
      required: [true, 'pickupStart timestamp is required'],
      index: true
    },
    pickupEnd: {
      type: Date,
      required: [true, 'pickupEnd timestamp is required'],
      index: true,
      validate: {
        validator: function (val) {
          return !this.pickupStart || val > this.pickupStart;
        },
        message: 'pickupEnd must be after pickupStart'
      }
    },
    pickupZone: {
      type: String,
      required: [true, 'pickupZone is required (e.g. North Campus, Downtown Zone 1)'],
      trim: true,
      index: true
    },
    // Sensitive/Private pickup address (sanitized for public view)
    pickupAddress: {
      streetAddress: { type: String, trim: true },
      buildingOrRoom: { type: String, trim: true },
      contactPhone: { type: String, trim: true },
      donorNotes: { type: String, trim: true }
    },
    status: {
      type: String,
      enum: Object.values(SURPLUS_STATUS),
      default: SURPLUS_STATUS.AVAILABLE,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for efficient pickup window & availability lookups
surplusLotSchema.index({ status: 1, pickupZone: 1, pickupEnd: 1 });
surplusLotSchema.index({ organizationId: 1, status: 1 });

/**
 * Pre-validate / Pre-save Hook:
 * 1. Guarantees missing allergen information defaults to UNKNOWN.
 * 2. Recalculates remainingQuantity and status transitions.
 * 3. Auto-expires if pickupEnd is past.
 */
surplusLotSchema.pre('validate', function () {
  // Enforce Allergen Safety: missing or empty allergenInfo must be marked as UNKNOWN
  if (!this.allergenInfo || typeof this.allergenInfo !== 'object') {
    this.allergenInfo = {
      status: 'UNKNOWN',
      allergens: [],
      isAllergenFree: false,
      crossContaminationRisk: 'UNKNOWN',
      details: 'UNKNOWN - Missing allergen information. Must not be assumed allergen-free.'
    };
  } else {
    // If donor provided a string, normalize to object
    if (typeof this.allergenInfo === 'string') {
      const text = this.allergenInfo.trim();
      this.allergenInfo = {
        status: text ? 'SPECIFIED' : 'UNKNOWN',
        allergens: [],
        isAllergenFree: false,
        crossContaminationRisk: 'UNKNOWN',
        details: text || 'UNKNOWN - Missing allergen information.'
      };
    }
    // If status is empty or allergens array is empty without explicit declaration
    if (!this.allergenInfo.status) {
      this.allergenInfo.status = (this.allergenInfo.allergens && this.allergenInfo.allergens.length > 0)
        ? 'CONTAINS'
        : 'UNKNOWN';
    }
    // Safety guarantee: never allow isAllergenFree to true if status is UNKNOWN
    if (this.allergenInfo.status === 'UNKNOWN') {
      this.allergenInfo.isAllergenFree = false;
    }
  }

  // Set remainingQuantity on initialization if not specified
  if (this.isNew && this.remainingQuantity === undefined) {
    this.remainingQuantity = this.quantity;
  }

  // Synchronize status based on quantity and time if not explicitly cancelled
  if (this.status !== SURPLUS_STATUS.CANCELLED) {
    const now = new Date();
    if (this.pickupEnd && this.pickupEnd < now) {
      this.status = SURPLUS_STATUS.EXPIRED;
    } else if (this.remainingQuantity <= 0) {
      this.status = SURPLUS_STATUS.FULLY_RESERVED;
    } else if (this.remainingQuantity < this.quantity) {
      this.status = SURPLUS_STATUS.PARTIALLY_RESERVED;
    } else {
      this.status = SURPLUS_STATUS.AVAILABLE;
    }
  }
});

/**
 * Static method to batch expire past lots
 */
surplusLotSchema.statics.expireOutdatedLots = async function () {
  const now = new Date();
  return this.updateMany(
    {
      pickupEnd: { $lt: now },
      status: { $in: [SURPLUS_STATUS.AVAILABLE, SURPLUS_STATUS.PARTIALLY_RESERVED] }
    },
    {
      $set: { status: SURPLUS_STATUS.EXPIRED }
    }
  );
};

/**
 * Instance method to sanitize listing for public inspection.
 * Strictest privacy guarantee: Never exposes private street address, room/building,
 * donor direct phone numbers, or recipient identities.
 */
surplusLotSchema.methods.toSanitizedPublic = function () {
  return {
    id: this._id,
    organizationId: this.organizationId,
    title: this.title,
    description: this.description,
    quantity: this.quantity,
    remainingQuantity: this.remainingQuantity,
    unit: this.unit,
    preparationInfo: this.preparationInfo,
    storageInfo: this.storageInfo,
    allergenInfo: {
      status: this.allergenInfo?.status || 'UNKNOWN',
      allergens: this.allergenInfo?.allergens || [],
      isAllergenFree: Boolean(this.allergenInfo?.isAllergenFree),
      crossContaminationRisk: this.allergenInfo?.crossContaminationRisk || 'UNKNOWN',
      details: this.allergenInfo?.details || 'UNKNOWN - Missing allergen information. Not verified allergen-free.'
    },
    pickupStart: this.pickupStart,
    pickupEnd: this.pickupEnd,
    pickupZone: this.pickupZone, // only neighborhood / general zone is visible publicly
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const SurplusLot = mongoose.model('SurplusLot', surplusLotSchema);

module.exports = {
  SurplusLot,
  SURPLUS_STATUS
};
