const express = require("express");
const BillingCompany = require("../models/BillingCompany");
const { verifyBillingToken } = require("../middleware/billingAuth");
const { cloudinary } = require("../config/cloudinary");

const router = express.Router();

// ==================== GET ROUTES ====================

// GET: All companies for logged-in company
router.get("/", verifyBillingToken, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = { companyId: req.companyId };
    
    // Handle challan types
    let billType = type;
    let challanSubType = null;
    
    if (type === "normal_challan") {
      billType = "challan";
      challanSubType = "normal";
    } else if (type === "gst_challan") {
      billType = "challan";
      challanSubType = "gst";
    }
    
    if (billType && billType !== "all" && billType !== "normal_challan" && billType !== "gst_challan") {
      query.billType = billType;
    }
    
    if (challanSubType) {
      query.billType = "challan";
      query.challanSubType = challanSubType;
    }
    
    // Filter by status
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }
    
    const companies = await BillingCompany.find(query)
      .sort({ name: 1, billType: 1 });
    
    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error("GET Companies Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching companies",
      error: error.message 
    });
  }
});

// GET: Companies by bill type
router.get("/type/:billType", verifyBillingToken, async (req, res) => {
  try {
    const { billType } = req.params;
    
    let query = { companyId: req.companyId, isActive: true };
    let challanSubType = null;
    let mainBillType = billType;
    
    if (billType === "normal_challan") {
      mainBillType = "challan";
      challanSubType = "normal";
    } else if (billType === "gst_challan") {
      mainBillType = "challan";
      challanSubType = "gst";
    }
    
    query.billType = mainBillType;
    if (challanSubType) {
      query.challanSubType = challanSubType;
    }
    
    const companies = await BillingCompany.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error("GET Companies by Type Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching companies",
      error: error.message 
    });
  }
});

// ==================== POST ROUTES ====================

// POST: Create new company
router.post("/", verifyBillingToken, async (req, res) => {
  try {
    const { 
      name, 
      address, 
      phone, 
      email,
      gstNo, 
      bankName, 
      accountNo, 
      ifscCode, 
      billType 
    } = req.body;
    
    // Validation
    if (!name || name.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Company name is required" 
      });
    }
    
    if (!billType) {
      return res.status(400).json({ 
        success: false, 
        message: "Bill type is required" 
      });
    }
    
    // Handle challan sub types
    let mainBillType = billType;
    let challanSubType = null;
    
    if (billType === "normal_challan") {
      mainBillType = "challan";
      challanSubType = "normal";
    } else if (billType === "gst_challan") {
      mainBillType = "challan";
      challanSubType = "gst";
    }
    
    // Check for duplicate company
    const existingCompany = await BillingCompany.findOne({
      companyId: req.companyId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      billType: mainBillType,
      challanSubType: challanSubType
    });
    
    if (existingCompany) {
      let typeDisplay = mainBillType;
      if (mainBillType === "challan") {
        typeDisplay = challanSubType === "normal" ? "Normal Challan" : "GST Challan";
      }
      return res.status(400).json({ 
        success: false, 
        message: `Company "${name}" already exists for ${typeDisplay}` 
      });
    }
    
    // Create new company
    const company = new BillingCompany({
      companyId: req.companyId,
      name: name.trim(),
      address: address || "",
      phone: phone || "",
      email: email || "",
      gstNo: gstNo ? gstNo.toUpperCase() : "",
      bankName: bankName || "",
      accountNo: accountNo || "",
      ifscCode: ifscCode ? ifscCode.toUpperCase() : "",
      billType: mainBillType,
      challanSubType: challanSubType,
      isActive: true
    });
    
    await company.save();
    
    let typeDisplay = mainBillType;
    if (mainBillType === "challan") {
      typeDisplay = challanSubType === "normal" ? "Normal Challan" : "GST Challan";
    } else if (mainBillType === "normal") typeDisplay = "Normal Bill";
    else if (mainBillType === "tax") typeDisplay = "Tax Invoice";
    else if (mainBillType === "corecutting") typeDisplay = "Core Cutting";
    
    res.status(201).json({
      success: true,
      message: `Company "${name}" added successfully for ${typeDisplay}`,
      company
    });
  } catch (error) {
    console.error("POST Company Error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Company with this name already exists for the selected bill type" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error creating company",
      error: error.message 
    });
  }
});

// PUT: Update company
router.put("/:id", verifyBillingToken, async (req, res) => {
  try {
    const { 
      name, 
      address, 
      phone, 
      email,
      gstNo, 
      bankName, 
      accountNo, 
      ifscCode, 
      billType,
      isActive 
    } = req.body;
    
    const company = await BillingCompany.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "Company not found" 
      });
    }
    
    // Handle challan sub types for update
    let mainBillType = billType || company.billType;
    let challanSubType = company.challanSubType;
    
    if (billType === "normal_challan") {
      mainBillType = "challan";
      challanSubType = "normal";
    } else if (billType === "gst_challan") {
      mainBillType = "challan";
      challanSubType = "gst";
    }
    
    // Check for duplicate (excluding current)
    if (name && name !== company.name) {
      const existingCompany = await BillingCompany.findOne({
        companyId: req.companyId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        billType: mainBillType,
        challanSubType: challanSubType,
        _id: { $ne: req.params.id }
      });
      
      if (existingCompany) {
        let typeDisplay = mainBillType;
        if (mainBillType === "challan") {
          typeDisplay = challanSubType === "normal" ? "Normal Challan" : "GST Challan";
        }
        return res.status(400).json({ 
          success: false, 
          message: `Company "${name}" already exists for ${typeDisplay}` 
        });
      }
    }
    
    // Update fields
    if (name) company.name = name.trim();
    if (address !== undefined) company.address = address;
    if (phone !== undefined) company.phone = phone;
    if (email !== undefined) company.email = email;
    if (gstNo !== undefined) company.gstNo = gstNo.toUpperCase();
    if (bankName !== undefined) company.bankName = bankName;
    if (accountNo !== undefined) company.accountNo = accountNo;
    if (ifscCode !== undefined) company.ifscCode = ifscCode.toUpperCase();
    if (billType) {
      company.billType = mainBillType;
      company.challanSubType = challanSubType;
    }
    if (isActive !== undefined) company.isActive = isActive;
    
    company.updatedAt = new Date();
    await company.save();
    
    res.json({
      success: true,
      message: "Company updated successfully",
      company
    });
  } catch (error) {
    console.error("PUT Company Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating company",
      error: error.message 
    });
  }
});

// DELETE: Soft delete company
router.delete("/:id", verifyBillingToken, async (req, res) => {
  try {
    const company = await BillingCompany.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "Company not found" 
      });
    }
    
    company.isActive = false;
    company.updatedAt = new Date();
    await company.save();
    
    let typeDisplay = company.billType;
    if (company.billType === "challan") {
      typeDisplay = company.challanSubType === "normal" ? "Normal Challan" : "GST Challan";
    } else if (company.billType === "normal") typeDisplay = "Normal Bill";
    else if (company.billType === "tax") typeDisplay = "Tax Invoice";
    else if (company.billType === "corecutting") typeDisplay = "Core Cutting";
    
    res.json({
      success: true,
      message: `Company "${company.name}" (${typeDisplay}) deleted successfully`
    });
  } catch (error) {
    console.error("DELETE Company Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting company",
      error: error.message 
    });
  }
});

module.exports = router;