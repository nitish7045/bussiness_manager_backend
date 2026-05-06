const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },

  advanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Advance"
  },

  companyId: {            // 🔥 ADD THIS
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["credit", "debit"]
  },

  amount: Number,

  remark: String,

  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AdvanceTransaction", transactionSchema);