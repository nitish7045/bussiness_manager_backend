const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  designation: {
    type: String,
    required: true
  },

  companyId: {
    type: String,
    required: true
  },

  wages: {
    monthly: {
      type: Number,
      required: true
    },

    calculationDays: {
      type: Number,
      default: 30
    },

    history: [
      {
        amount: Number,
        type: String,
        date: Date,
        reason: String
      }
    ]
  },

  phone: {
    type: String,
    required: true
  },

  upi: {
    id: String,
    qr: String
  },

  bank: {
    accountNumber: String,
    ifsc: String
  },

  aadhaar: String,
  
  // Store images as Base64 strings
  profilePhoto: {
    type: String,
    default: null
  },
  
  aadhaarPhoto: {
    type: String,
    default: null
  },

  experience: Number,

  extraFields: {
    type: Map,
    of: String
  },

  status: {
    type: String,
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Employee", employeeSchema);