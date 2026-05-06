const express = require("express");
const router = express.Router();

const Advance = require("../models/Advance");
const Transaction = require("../models/AdvanceTransaction");
const auth = require("../middleware/authMiddleware");

// ➕ Add advance (credit)
router.post("/credit", auth, async (req, res) => {
  try {
    const { workerId, amount, type, remark } = req.body;

    let advance = await Advance.findOne({
      workerId,
      type,
      companyId: req.user.companyId
    });

    if (!advance) {
      advance = new Advance({
        workerId,
        type,
        companyId: req.user.companyId
      });
    }

    advance.totalAmount += amount;
    advance.remainingAmount += amount;

    await advance.save();

    await Transaction.create({
      workerId,
      advanceId: advance._id,
      companyId: req.user.companyId, // 🔥 ADD THIS,
      type: "credit",
      amount,
      remark
    });

    res.json(advance);

  } catch (err) {
    res.status(500).json(err);
  }
});

// ➖ Deduct advance
router.post("/debit", auth, async (req, res) => {
  try {
    const { advanceId, amount, remark } = req.body;

    const advance = await Advance.findById(advanceId);

    if (!advance) return res.status(404).json({ msg: "Not found" });

    if (amount > advance.remainingAmount) {
      return res.status(400).json({ msg: "Too much deduction" });
    }

    advance.remainingAmount -= amount;
    await advance.save();

    await Transaction.create({
      workerId: advance.workerId,
      advanceId,
      companyId: req.user.companyId, // 🔥 ADD THIS,
      type: "debit",
      amount,
      remark
    });

    res.json(advance);

  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/transactions", auth, async (req, res) => {
  try {
    const { workerId, advanceId } = req.query;

    let filter = {
      companyId: req.user.companyId
    };

    if (workerId) filter.workerId = workerId;
    if (advanceId) filter.advanceId = advanceId;

    const transactions = await Transaction.find(filter)
      .populate("workerId", "name designation")
      .sort({ date: -1 });

    res.json(transactions);

  } catch (err) {
    res.status(500).json(err);
  }
});

// Get advances by worker ID
router.get("/worker/:workerId", auth, async (req, res) => {
  try {
    const advances = await Advance.find({
      workerId: req.params.workerId,
      companyId: req.user.companyId
    }).sort({ createdAt: -1 });
    
    res.json(advances);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;