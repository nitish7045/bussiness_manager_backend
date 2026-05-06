const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingProduct"
  },
  productCode: String,
  productName: String,
  quantity: Number,
  unitPrice: Number,
  discount: {
    type: Number,
    default: 0
  },
  taxRate: Number,
  taxAmount: Number,
  total: Number
});

const billingInvoiceSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingCustomer",
    required: true
  },
  customerName: String,
  customerPhone: String,
  customerGST: String,
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ["paid", "partial", "unpaid"],
    default: "unpaid"
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi", "bank_transfer", "cheque"],
    default: "cash"
  },
  notes: {
    type: String,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingUser"
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

billingInvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
billingInvoiceSchema.index({ companyId: 1, customerId: 1 });
billingInvoiceSchema.index({ companyId: 1, invoiceDate: 1 });

module.exports = mongoose.model("BillingInvoice", billingInvoiceSchema);