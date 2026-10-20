const { z } = require('zod');

// Schema for allergen information
const allergenInfoSchema = z.union([
  z.string().transform((val) => {
    const text = val.trim();
    if (!text) {
      return {
        status: 'UNKNOWN',
        allergens: [],
        isAllergenFree: false,
        crossContaminationRisk: 'UNKNOWN',
        details: 'UNKNOWN - Missing allergen information. Not verified allergen-free.'
      };
    }
    return {
      status: 'SPECIFIED',
      allergens: [],
      isAllergenFree: false,
      crossContaminationRisk: 'UNKNOWN',
      details: text
    };
  }),
  z.object({
    status: z.enum(['UNKNOWN', 'SPECIFIED', 'CONTAINS', 'NONE_DECLARED']).default('UNKNOWN'),
    allergens: z.array(z.string()).default([]),
    isAllergenFree: z.boolean().default(false),
    crossContaminationRisk: z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH']).default('UNKNOWN'),
    details: z.string().optional()
  }).transform((data) => {
    // CRITICAL REQUIREMENT: Missing allergen information must be treated as UNKNOWN, not allergen-free
    if (!data.status || (data.allergens.length === 0 && !data.details && !data.isAllergenFree)) {
      return {
        ...data,
        status: 'UNKNOWN',
        isAllergenFree: false,
        details: data.details || 'UNKNOWN - Missing allergen information. Must not be assumed allergen-free.'
      };
    }
    // Safety check: If status is UNKNOWN, never allow isAllergenFree to be true
    if (data.status === 'UNKNOWN') {
      return {
        ...data,
        isAllergenFree: false
      };
    }
    return data;
  })
]).optional().default({
  status: 'UNKNOWN',
  allergens: [],
  isAllergenFree: false,
  crossContaminationRisk: 'UNKNOWN',
  details: 'UNKNOWN - Missing allergen information. Must not be assumed allergen-free.'
});

const createSurplusLotSchema = z.object({
  organizationId: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit of measurement is required'),
  preparationInfo: z.union([
    z.string().min(1, 'Preparation details required'),
    z.record(z.any())
  ]),
  storageInfo: z.union([
    z.string().min(1, 'Storage information required'),
    z.record(z.any())
  ]),
  allergenInfo: allergenInfoSchema,
  pickupStart: z.coerce.date(),
  pickupEnd: z.coerce.date(),
  pickupZone: z.string().min(2, 'pickupZone is required (e.g. Campus North, Downtown)'),
  pickupAddress: z.object({
    streetAddress: z.string().optional(),
    buildingOrRoom: z.string().optional(),
    contactPhone: z.string().optional(),
    donorNotes: z.string().optional()
  }).optional()
}).refine((data) => data.pickupEnd > data.pickupStart, {
  message: 'pickupEnd must be after pickupStart',
  path: ['pickupEnd']
});

const updateSurplusLotSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(2000).optional(),
  quantity: z.number().int().positive('Quantity must be greater than 0').optional(),
  unit: z.string().min(1).optional(),
  preparationInfo: z.union([
    z.string().min(1),
    z.record(z.any())
  ]).optional(),
  storageInfo: z.union([
    z.string().min(1),
    z.record(z.any())
  ]).optional(),
  allergenInfo: allergenInfoSchema.optional(),
  pickupStart: z.coerce.date().optional(),
  pickupEnd: z.coerce.date().optional(),
  pickupZone: z.string().min(2).optional(),
  pickupAddress: z.object({
    streetAddress: z.string().optional(),
    buildingOrRoom: z.string().optional(),
    contactPhone: z.string().optional(),
    donorNotes: z.string().optional()
  }).optional(),
  status: z.enum(['AVAILABLE', 'PARTIALLY_RESERVED', 'FULLY_RESERVED', 'EXPIRED', 'CANCELLED']).optional()
}).refine((data) => {
  if (data.pickupStart && data.pickupEnd) {
    return data.pickupEnd > data.pickupStart;
  }
  return true;
}, {
  message: 'pickupEnd must be after pickupStart',
  path: ['pickupEnd']
});

module.exports = {
  createSurplusLotSchema,
  updateSurplusLotSchema
};
