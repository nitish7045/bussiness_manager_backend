const mongoose = require("mongoose");

const billingCompanySchema = new mongoose.Schema({
  // Main company ID (from billing auth)
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  // Company basic details
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  
  // GST Details
  gstNo: {
    type: String,
    default: "",
    uppercase: true
  },
  
  // Bank Details
  bankName: {
    type: String,
    default: ""
  },
  accountNo: {
    type: String,
    default: ""
  },
  ifscCode: {
    type: String,
    default: "",
    uppercase: true
  },
  
  // Signature Details
  signatureUrl: {
    type: String,
    default: ""
  },
  signaturePublicId: {
    type: String,
    default: ""
  },
  
  // Bill Type (what type of bills this company creates)
  billType: {
    type: String,
    enum: ["normal", "tax", "corecutting", "challan"],
    required: true
  },
  
  // Sub type for challan (normal or gst)
  challanSubType: {
    type: String,
    enum: ["normal", "gst"],
    default: null
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// IMPORTANT: Allow same company name for different bill types
// Compound index: companyId + name + billType + challanSubType must be unique
billingCompanySchema.index({ companyId: 1, name: 1, billType: 1, challanSubType: 1 }, { unique: true });

// Indexes for faster queries
billingCompanySchema.index({ companyId: 1, isActive: 1 });
billingCompanySchema.index({ companyId: 1, billType: 1 });

// Update timestamp on save
billingCompanySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("BillingCompany", billingCompanySchema);