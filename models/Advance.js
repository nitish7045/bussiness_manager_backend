const mongoose = require("mongoose");

const advanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  companyId: String,

  type: {
    type: String,
    enum: ["loan", "monthly"],
    required: true
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  remainingAmount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Advance", advanceSchema);