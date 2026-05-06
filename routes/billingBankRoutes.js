const express = require("express");
const BillingBank = require("../models/BillingBank");
const { verifyBillingToken } = require("../middleware/billingAuth");

const router = express.Router();

// Get all banks for company
router.get("/", verifyBillingToken, async (req, res) => {
  try {
    const banks = await BillingBank.find({ 
      companyId: req.companyId,
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json(banks);
  } catch (err) {
    console.error("Error fetching banks:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Get single bank by ID
router.get("/:id", verifyBillingToken, async (req, res) => {
  try {
    const bank = await BillingBank.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!bank) {
      return res.status(404).json({ msg: "Bank not found" });
    }
    
    res.json(bank);
  } catch (err) {
    console.error("Error fetching bank:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Add new bank
router.post("/", verifyBillingToken, async (req, res) => {
  try {
    const { bankName, accountNumber, ifscCode, branch, accountHolderName, upiId } = req.body;

    // Check if bank account already exists for this company
    const existingBank = await BillingBank.findOne({
      companyId: req.companyId,
      accountNumber: accountNumber
    });

    if (existingBank) {
      return res.status(400).json({ msg: "Bank account number already exists" });
    }

    const newBank = new BillingBank({
      companyId: req.companyId,
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      branch,
      accountHolderName: accountHolderName || "",
      upiId: upiId || ""
    });

    await newBank.save();
    
    res.status(201).json({
      success: true,
      message: "Bank added successfully",
      bank: newBank
    });
  } catch (err) {
    console.error("Error adding bank:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Update bank
router.put("/:id", verifyBillingToken, async (req, res) => {
  try {
    const { bankName, accountNumber, ifscCode, branch, accountHolderName, upiId } = req.body;

    const bank = await BillingBank.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!bank) {
      return res.status(404).json({ msg: "Bank not found" });
    }

    // Check if new account number conflicts with another bank
    if (accountNumber !== bank.accountNumber) {
      const existingBank = await BillingBank.findOne({
        companyId: req.companyId,
        accountNumber: accountNumber,
        _id: { $ne: req.params.id }
      });
      
      if (existingBank) {
        return res.status(400).json({ msg: "Bank account number already exists" });
      }
    }

    bank.bankName = bankName;
    bank.accountNumber = accountNumber;
    bank.ifscCode = ifscCode.toUpperCase();
    bank.branch = branch;
    bank.accountHolderName = accountHolderName || "";
    bank.upiId = upiId || "";
    bank.updatedAt = new Date();

    await bank.save();
    
    res.json({
      success: true,
      message: "Bank updated successfully",
      bank
    });
  } catch (err) {
    console.error("Error updating bank:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Delete bank (soft delete)
router.delete("/:id", verifyBillingToken, async (req, res) => {
  try {
    const bank = await BillingBank.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!bank) {
      return res.status(404).json({ msg: "Bank not found" });
    }

    // Soft delete - just mark as inactive
    bank.isActive = false;
    await bank.save();
    
    res.json({
      success: true,
      message: "Bank deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting bank:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Hard delete (permanent removal)
router.delete("/:id/permanent", verifyBillingToken, async (req, res) => {
  try {
    const result = await BillingBank.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!result) {
      return res.status(404).json({ msg: "Bank not found" });
    }
    
    res.json({
      success: true,
      message: "Bank permanently deleted"
    });
  } catch (err) {
    console.error("Error permanently deleting bank:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Get bank summary (for dashboard)
router.get("/summary", verifyBillingToken, async (req, res) => {
  try {
    const banks = await BillingBank.find({ 
      companyId: req.companyId,
      isActive: true 
    });
    
    const summary = {
      totalBanks: banks.length,
      banks: banks.map(bank => ({
        id: bank._id,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        ifscCode: bank.ifscCode
      }))
    };
    
    res.json(summary);
  } catch (err) {
    console.error("Error fetching bank summary:", err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;