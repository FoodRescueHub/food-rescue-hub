const { SurplusLot, SURPLUS_STATUS } = require('../models/SurplusLot');
const { createSurplusLotSchema, updateSurplusLotSchema } = require('../validators/surplusLotValidator');
const { sanitizeSurplusLot } = require('../middleware/sanitizer');
const mongoose = require('mongoose');

/**
 * POST /api/surplus
 * Allows authorized donor to post a surplus lot.
 */
const createSurplusLot = async (req, res) => {
  try {
    // 1. Validate request payload using Zod
    const validationResult = createSurplusLotSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const data = validationResult.data;

    // 2. Determine organizationId and createdBy from authenticated session
    const organizationId = req.user?.organizationId || data.organizationId;
    const createdBy = req.user?._id || req.user?.id || data.createdBy;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Missing Organization',
        message: 'A valid organizationId must be associated with the donor account'
      });
    }

    if (!createdBy) {
      return res.status(400).json({
        error: 'Missing Creator',
        message: 'A valid createdBy user identity is required'
      });
    }

    // 3. Create Surplus Lot
    const surplusLot = new SurplusLot({
      ...data,
      organizationId,
      createdBy,
      remainingQuantity: data.quantity,
      status: SURPLUS_STATUS.AVAILABLE
    });

    const savedLot = await surplusLot.save();

    // 4. Return created lot (full details for the donor)
    return res.status(201).json({
      message: 'Surplus food listing created successfully',
      data: sanitizeSurplusLot(savedLot, req.user)
    });
  } catch (err) {
    console.error('Error creating surplus lot:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: err.message || 'Failed to create surplus listing'
    });
  }
};

/**
 * GET /api/surplus
 * View available surplus food listings.
 * Public users receive sanitized summaries without recipient identities or exact private addresses.
 */
const getSurplusLots = async (req, res) => {
  try {
    const {
      pickupZone,
      status,
      search,
      organizationId,
      availableOnly = 'true',
      includeExpired = 'false',
      page = 1,
      limit = 50
    } = req.query;

    // Auto-expire outdated lots prior to query
    await SurplusLot.expireOutdatedLots();

    // Build query filter
    const filter = {};

    // By default, only show AVAILABLE or PARTIALLY_RESERVED for public availability
    if (status) {
      filter.status = status.toUpperCase();
    } else if (includeExpired !== 'true') {
      filter.status = { $in: [SURPLUS_STATUS.AVAILABLE, SURPLUS_STATUS.PARTIALLY_RESERVED] };
    }

    if (pickupZone) {
      filter.pickupZone = { $regex: new RegExp(pickupZone.trim(), 'i') };
    }

    if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = organizationId;
    }

    if (availableOnly === 'true' && !status) {
      filter.remainingQuantity = { $gt: 0 };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { unit: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [lots, totalCount] = await Promise.all([
      SurplusLot.find(filter)
        .sort({ pickupStart: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SurplusLot.countDocuments(filter)
    ]);

    // Sanitize each lot for response (respecting viewer permissions)
    const sanitizedData = lots.map((lot) => sanitizeSurplusLot(lot, req.user));

    return res.status(200).json({
      count: sanitizedData.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: sanitizedData
    });
  } catch (err) {
    console.error('Error fetching surplus lots:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: err.message || 'Failed to retrieve surplus listings'
    });
  }
};

/**
 * GET /api/surplus/:id
 * Retrieve details for a single surplus lot.
 * Public users receive sanitized information; only authorized donor org members see exact pickup addresses.
 */
const getSurplusLotById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Provided surplus lot ID is not a valid format'
      });
    }

    const lot = await SurplusLot.findById(id);
    if (!lot) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Surplus lot with ID ${id} was not found`
      });
    }

    // Auto-update expired status if pickupEnd passed
    if (lot.pickupEnd < new Date() && lot.status !== SURPLUS_STATUS.CANCELLED && lot.status !== SURPLUS_STATUS.EXPIRED) {
      lot.status = SURPLUS_STATUS.EXPIRED;
      await lot.save();
    }

    return res.status(200).json({
      data: sanitizeSurplusLot(lot, req.user)
    });
  } catch (err) {
    console.error('Error fetching surplus lot by id:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: err.message || 'Failed to retrieve surplus listing'
    });
  }
};

/**
 * PATCH /api/surplus/:id
 * Allows donor to edit a surplus listing.
 * Can correct inaccurate information, update quantities, prep/storage/allergen details, or cancel.
 */
const updateSurplusLot = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Provided surplus lot ID is not a valid format'
      });
    }

    // 1. Find existing lot
    const lot = await SurplusLot.findById(id);
    if (!lot) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Surplus lot with ID ${id} was not found`
      });
    }

    // 2. Authorization check: Only donor belonging to lot organization or coordinator can edit
    const isDonorOwner =
      req.user &&
      req.user.organizationId &&
      String(lot.organizationId) === String(req.user.organizationId);

    const isPlatformCoordinator = req.user && req.user.role === 'coordinator';

    if (!isDonorOwner && !isPlatformCoordinator) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are only authorized to edit listings belonging to your verified organization'
      });
    }

    // 3. Status Guard: Cannot edit cancelled or expired lots unless reopening window
    if (lot.status === SURPLUS_STATUS.CANCELLED && req.body.status !== SURPLUS_STATUS.AVAILABLE) {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Cannot edit a cancelled listing unless status is being explicitly reopened to AVAILABLE'
      });
    }

    // 4. Validate updates with Zod
    const validationResult = updateSurplusLotSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const updates = validationResult.data;

    // 5. Quantity validation: Cannot reduce total quantity below amount already reserved!
    const currentlyReserved = lot.quantity - lot.remainingQuantity;

    if (updates.quantity !== undefined) {
      if (updates.quantity < currentlyReserved) {
        return res.status(400).json({
          error: 'Invalid Quantity',
          message: `Cannot reduce total quantity to ${updates.quantity}. ${currentlyReserved} ${lot.unit} have already been reserved by community recipients.`
        });
      }
      // Re-calculate remainingQuantity
      lot.quantity = updates.quantity;
      lot.remainingQuantity = updates.quantity - currentlyReserved;
    }

    // 6. Apply scalar updates
    if (updates.title !== undefined) lot.title = updates.title;
    if (updates.description !== undefined) lot.description = updates.description;
    if (updates.unit !== undefined) lot.unit = updates.unit;
    if (updates.preparationInfo !== undefined) lot.preparationInfo = updates.preparationInfo;
    if (updates.storageInfo !== undefined) lot.storageInfo = updates.storageInfo;
    if (updates.allergenInfo !== undefined) lot.allergenInfo = updates.allergenInfo;
    if (updates.pickupStart !== undefined) lot.pickupStart = updates.pickupStart;
    if (updates.pickupEnd !== undefined) lot.pickupEnd = updates.pickupEnd;
    if (updates.pickupZone !== undefined) lot.pickupZone = updates.pickupZone;
    if (updates.pickupAddress !== undefined) {
      lot.pickupAddress = {
        ...lot.pickupAddress?.toObject?.(),
        ...updates.pickupAddress
      };
    }

    // 7. Status updates
    if (updates.status !== undefined) {
      lot.status = updates.status;
    } else {
      // Re-evaluate status automatically based on quantity
      if (lot.remainingQuantity === 0) {
        lot.status = SURPLUS_STATUS.FULLY_RESERVED;
      } else if (lot.remainingQuantity < lot.quantity) {
        lot.status = SURPLUS_STATUS.PARTIALLY_RESERVED;
      } else {
        lot.status = SURPLUS_STATUS.AVAILABLE;
      }
    }

    const updatedLot = await lot.save();

    return res.status(200).json({
      message: 'Surplus food listing updated successfully',
      data: sanitizeSurplusLot(updatedLot, req.user)
    });
  } catch (err) {
    console.error('Error updating surplus lot:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: err.message || 'Failed to update surplus listing'
    });
  }
};

module.exports = {
  createSurplusLot,
  getSurplusLots,
  getSurplusLotById,
  updateSurplusLot
};
