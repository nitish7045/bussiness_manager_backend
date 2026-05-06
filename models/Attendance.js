const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },

  companyId: {
    type: String,
    required: true
  },

  date: {
    type: String, // Store as YYYY-MM-DD string to avoid timezone issues
    required: true
  },

  status: {
    type: String,
    enum: ["present", "absent", "holiday", "halfday"],
    default: "present"
  },

  overtimeHours: {
    type: Number,
    default: 0
  },

  remark: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index to prevent duplicate attendance for same worker on same date
attendanceSchema.index({ workerId: 1, date: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);