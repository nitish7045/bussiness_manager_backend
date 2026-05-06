const mongoose = require("mongoose");

const billingUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "staff", "viewer"],
    default: "staff"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  }
});

// Compound index for company-based queries
billingUserSchema.index({ companyId: 1, username: 1 });

module.exports = mongoose.model("BillingUser", billingUserSchema);