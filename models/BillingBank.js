const mongoose = require("mongoose");

const billingBankSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    default: ""
  },
  upiId: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate accounts per company
billingBankSchema.index({ companyId: 1, accountNumber: 1 }, { unique: true });

module.exports = mongoose.model("BillingBank", billingBankSchema);