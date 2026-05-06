const mongoose = require("mongoose");

const billingProductSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: Number,
    required: true
  },
  productCode: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: "NOS"
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
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

// Compound unique index: companyId + name (same company can't have duplicate product names)
billingProductSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Compound unique index: companyId + productId (each company has its own sequence)
billingProductSchema.index({ companyId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("BillingProduct", billingProductSchema);