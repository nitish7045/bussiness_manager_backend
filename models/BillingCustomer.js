const mongoose = require("mongoose");

const billingCustomerSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: Number,
    required: true
  },
  customerCode: {
    type: String,
    required: true
  },
  toAddress: {
    type: String,
    default: ""
  },
  site: {
    type: String,
    default: ""
  },
  name: {
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
  gstNumber: {
    type: String,
    default: ""
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
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

// Remove unique index on name (since name might be empty)
// Only keep companyId + customerId as unique
billingCustomerSchema.index({ companyId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model("BillingCustomer", billingCustomerSchema);