
const mongoose = require("mongoose");
const { z } = require("zod");
const Need = require("../models/Need");
const Donation = require("../models/Donation");
const User = require("../models/User");
const Reservation = require("../models/Reservation");

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const windowSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((value) => value.start < value.end, {
    message: "Pickup window start must be before its end",
  });

function validId(value, label) {
  const parsed = objectIdSchema.safeParse(String(value ?? ""));

  if (!parsed.success) {
    throw new Error(`${label} must be a valid MongoDB ID`);
  }

  return new mongoose.Types.ObjectId(parsed.data);
}

function validateWindow(start, end) {
  const parsed = windowSchema.safeParse({ start, end });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => issue.message).join("; ")
    );
  }

  return parsed.data;
}

async function getActiveReservations(donationIds) {
  if (!donationIds.length) return [];

  return Reservation.find({
    surplusLotId: { $in: donationIds },
    $or: [
      { status: "CONFIRMED" },
      {
        status: "HELD",
        expiresAt: { $gt: new Date() },
      },
    ],
  })
    .select("surplusLotId status expiresAt")
    .lean();
}

async function readNeeds(organizationId) {
  const orgId = validId(organizationId, "organizationId");

  return Need.find({
    organizationId: orgId,
    status: "ACTIVE",
    pickupEnd: { $gt: new Date() },
  })
    .sort({ pickupStart: 1 })
    .lean();
}

async function findAvailableLots(window) {
  const parsed = windowSchema.safeParse(window);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => issue.message).join("; ")
    );
  }

  const { start, end } = parsed.data;

  const lots = await Donation.find({
    status: "AVAILABLE",
    expiryDate: { $gt: start },
  })
    .sort({ expiryDate: 1 })
    .lean();

  const reservations = await getActiveReservations(
    lots.map((lot) => lot._id)
  );

  const reservedIds = new Set(
    reservations.map((reservation) =>
      String(reservation.surplusLotId)
    )
  );

  return lots
    .filter((lot) => !reservedIds.has(String(lot._id)))
    .map((lot) => ({
      ...lot,
      reservedOrHeld: false,
      allergenStatus: "UNKNOWN",
      proposedPickupWindow: { start, end },
      requiresCoordinatorReview: true,
      warnings: [
        "Allergen information is unavailable; verify before approval.",
        "Donor pickup-time availability must be confirmed.",
        "Travel time and volunteer capacity must be verified.",
        "Confirm the donation remains available before reservation.",
      ],
    }));
}

async function checkPickupCapacity(volunteerId, lots) {
  const volunteerObjectId = validId(volunteerId, "volunteerId");

  const lotsSchema = z
    .array(
      z
        .object({
          donationId: objectIdSchema,
          pickupStart: z.coerce.date(),
          pickupEnd: z.coerce.date(),
        })
        .refine((lot) => lot.pickupStart < lot.pickupEnd, {
          message: "Each pickup window must start before its end",
        })
    )
    .min(1);

  const parsed = lotsSchema.safeParse(lots);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => issue.message).join("; ")
    );
  }

  const volunteer = await User.findOne({
    _id: volunteerObjectId,
    role: "VOLUNTEER",
  })
    .select("_id name role")
    .lean();

  if (!volunteer) {
    return {
      feasible: false,
      capacityConfigured: false,
      requiresCoordinatorReview: true,
      warnings: ["Volunteer not found or user is not a volunteer."],
    };
  }

  const donationIds = parsed.data.map(
    (lot) => new mongoose.Types.ObjectId(lot.donationId)
  );

  const reservations = await getActiveReservations(donationIds);

  const reservedIds = new Set(
    reservations.map((reservation) =>
      String(reservation.surplusLotId)
    )
  );

  const conflictingLots = parsed.data
    .filter((lot) => reservedIds.has(String(lot.donationId)))
    .map((lot) => lot.donationId);

  const overlappingProposedPickups = [];

  for (let i = 0; i < parsed.data.length; i += 1) {
    for (let j = i + 1; j < parsed.data.length; j += 1) {
      const first = parsed.data[i];
      const second = parsed.data[j];

      if (
        new Date(first.pickupStart) < new Date(second.pickupEnd) &&
        new Date(second.pickupStart) < new Date(first.pickupEnd)
      ) {
        overlappingProposedPickups.push({
          firstDonationId: first.donationId,
          secondDonationId: second.donationId,
        });
      }
    }
  }

  const warnings = [
    "Volunteer capacity and existing volunteer schedules are not stored in the current schema.",
    "Coordinator must verify travel estimates and donor availability.",
  ];

  if (conflictingLots.length) {
    warnings.push("Some proposed donations already have active reservations.");
  }

  if (overlappingProposedPickups.length) {
    warnings.push("Some proposed pickups have overlapping time windows.");
  }

  return {
    volunteerId: String(volunteer._id),
    volunteerName: volunteer.name,
    eligibleVolunteer: true,
    capacityConfigured: false,
    feasible:
      conflictingLots.length === 0 &&
      overlappingProposedPickups.length === 0,
    conflictingLots,
    overlappingProposedPickups,
    requiresCoordinatorReview: true,
    warnings,
  };
}

module.exports = {
  readNeeds,
  findAvailableLots,
  checkPickupCapacity,
};
