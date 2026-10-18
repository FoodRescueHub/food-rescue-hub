require("dotenv").config();

const connectDB = require("../config/db");
const Donation = require("../models/Donation");
const { createDonationEmbedding } = require("../services/matchingService");

async function backfillDonationEmbeddings() {
  await connectDB();
  const donations = await Donation.find({ embedding: { $exists: false } })
    .select("foodName description unit")
    .lean();
  let updated = 0;

  for (const donation of donations) {
    const embedding = await createDonationEmbedding(donation);
    await Donation.updateOne(
      { _id: donation._id, embedding: { $exists: false } },
      { $set: { embedding } }
    );
    updated += 1;
    console.log(`Embedded listing ${donation._id} (${updated}/${donations.length})`);
  }

  console.log(`Backfill complete: ${updated} donation embeddings created.`);
  await Donation.db.close();
}

backfillDonationEmbeddings().catch(async (error) => {
  console.error("Donation embedding backfill failed:", error.message);
  await Donation.db.close().catch(() => {});
  process.exitCode = 1;
});
