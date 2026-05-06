const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  companyId: {
    type: String,
    required: true
  },

  month: {
    type: Number,
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  // Attendance Data
  attendance: {
    weekdayPresent: { type: Number, default: 0 },
    weekdayHalf: { type: Number, default: 0 },
    sundayPresent: { type: Number, default: 0 },
    sundayHalf: { type: Number, default: 0 },
    sundayHoliday: { type: Number, default: 0 },
    otherHolidays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    totalSundays: { type: Number, default: 0 }
  },

  // Salary Rates
  dailySalary: { type: Number, default: 0 },
  hourlySalary: { type: Number, default: 0 },

  // Earnings Breakdown
  earnings: {
    weekdayPay: { type: Number, default: 0 },
    weekdayHalfPay: { type: Number, default: 0 },
    sundayPresentPay: { type: Number, default: 0 },
    sundayHalfPay: { type: Number, default: 0 },
    sundayHolidayPay: { type: Number, default: 0 },
    otherHolidayPay: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },

  // Deductions Applied This Month
  deductions: {
    monthlyAdvanceDeducted: { type: Number, default: 0 },
    loanDeducted: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
  },

  // Carry Forward from Previous Months
  carryForwardFromPrev: {
    monthlyAdvance: { type: Number, default: 0 },
    loan: { type: Number, default: 0 }
  },

  // New Advances/Loans Given This Month
  newAdvances: {
    monthlyAdvance: { type: Number, default: 0 },
    loan: { type: Number, default: 0 }
  },

  // Remaining to Carry Forward
  carryForwardToNext: {
    monthlyAdvance: { type: Number, default: 0 },
    loan: { type: Number, default: 0 }
  },

  netSalary: { type: Number, default: 0 },

  // Owner Edits
  ownerEdits: {
    monthlyAdvanceDeduction: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    notes: { type: String, default: "" }
  },

  status: {
    type: String,
    enum: ["calculated", "reviewed", "processed", "paid"],
    default: "calculated"
  },

  processedAt: Date,
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

salarySchema.index({ workerId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);