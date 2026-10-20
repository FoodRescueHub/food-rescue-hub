const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['DONOR', 'RECIPIENT'],
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationAuditReason: {
      type: String,
      default: null
    },
    primaryContactEmail: {
      type: String,
      required: true,
      trim: true
    },
    zone: {
      type: String,
      required: true,
      trim: true
    },
    privateAddress: {
      streetAddress: String,
      building: String,
      city: String,
      phone: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
