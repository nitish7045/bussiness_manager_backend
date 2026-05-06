const express = require("express");
const BillingCustomer = require("../models/BillingCustomer");
const { verifyBillingToken } = require("../middleware/billingAuth");

const router = express.Router();

// Helper: Get next customer ID for a specific company
async function getNextCustomerId(companyId) {
  const lastCustomer = await BillingCustomer.findOne({ companyId }).sort({ customerId: -1 });
  return lastCustomer ? lastCustomer.customerId + 1 : 1;
}

// Helper: Generate customer code
function generateCustomerCode(customerId) {
  return `C${String(customerId).padStart(4, '0')}`;
}

// GET: All active customers for logged-in company
router.get("/", verifyBillingToken, async (req, res) => {
  try {
    console.log("Fetching active customers for company:", req.companyId);
    const customers = await BillingCustomer.find({ 
      companyId: req.companyId,
      isActive: true 
    }).sort({ customerId: 1 });
    
    res.json(customers);
  } catch (error) {
    console.error("GET Customers Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: All soft-deleted customers for logged-in company
router.get("/deleted", verifyBillingToken, async (req, res) => {
  try {
    console.log("Fetching deleted customers for company:", req.companyId);
    const customers = await BillingCustomer.find({ 
      companyId: req.companyId,
      isActive: false 
    }).sort({ customerId: 1 });
    
    console.log("Found deleted customers:", customers.length);
    res.json(customers);
  } catch (error) {
    console.error("GET Deleted Customers Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Single customer by ID
router.get("/:id", verifyBillingToken, async (req, res) => {
  try {
    const customer = await BillingCustomer.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    
    res.json(customer);
  } catch (error) {
    console.error("GET Customer Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Create new customer - NO DUPLICATE CHECKS
router.post("/", verifyBillingToken, async (req, res) => {
  try {
    const { toAddress, site } = req.body;
    const companyId = req.companyId;

    console.log("Creating customer for company:", companyId);
    console.log("Received data:", { toAddress, site });

    // Validation: at least one of toAddress or site should be provided
    if ((!toAddress || toAddress.trim() === "") && (!site || site.trim() === "")) {
      return res.status(400).json({ 
        success: false, 
        message: "Either 'To Address' or 'Site' is required" 
      });
    }

    // Get next customer ID for this company
    const nextId = await getNextCustomerId(companyId);
    const customerCode = generateCustomerCode(nextId);

    // Create new customer - NO DUPLICATE CHECKS
    const customer = new BillingCustomer({
      companyId,
      customerId: nextId,
      customerCode,
      toAddress: toAddress || "",
      site: site || "",
      name: site || toAddress?.split('\n')[0] || "",
      isActive: true
    });

    await customer.save();

    console.log("Customer saved:", customer);

    res.status(201).json({
      success: true,
      message: `Customer added successfully! Code: ${customerCode}`,
      customer
    });

  } catch (error) {
    console.error("POST Customer Error:", error);
    
    // Only handle database errors, not duplicate validation
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT: Update customer - NO DUPLICATE CHECKS
router.put("/:id", verifyBillingToken, async (req, res) => {
  try {
    const { toAddress, site } = req.body;
    const companyId = req.companyId;

    // Find customer belonging to this company
    const customer = await BillingCustomer.findOne({
      _id: req.params.id,
      companyId
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Validation: at least one of toAddress or site should be provided
    if ((!toAddress || toAddress.trim() === "") && (!site || site.trim() === "")) {
      return res.status(400).json({ 
        success: false, 
        message: "Either 'To Address' or 'Site' is required" 
      });
    }

    // Update fields - NO DUPLICATE CHECKS
    if (toAddress !== undefined) customer.toAddress = toAddress;
    if (site !== undefined) customer.site = site;
    if (site) customer.name = site;
    else if (toAddress) customer.name = toAddress.split('\n')[0];
    customer.updatedAt = new Date();

    await customer.save();

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer
    });

  } catch (error) {
    console.error("PUT Customer Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Soft delete customer (move to trash)
router.delete("/:id", verifyBillingToken, async (req, res) => {
  try {
    console.log("Soft deleting customer:", req.params.id);
    
    const customer = await BillingCustomer.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Soft delete - mark as inactive
    customer.isActive = false;
    customer.updatedAt = new Date();
    await customer.save();

    console.log("Customer soft deleted:", customer._id);

    res.json({
      success: true,
      message: "Customer moved to trash successfully"
    });

  } catch (error) {
    console.error("DELETE Customer Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Hard delete (permanent removal)
router.delete("/:id/permanent", verifyBillingToken, async (req, res) => {
  try {
    console.log("Permanently deleting customer:", req.params.id);
    
    const customer = await BillingCustomer.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    console.log("Customer permanently deleted:", customer._id);

    res.json({
      success: true,
      message: "Customer permanently deleted"
    });

  } catch (error) {
    console.error("DELETE Permanent Customer Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Recover a soft-deleted customer
router.post("/:id/recover", verifyBillingToken, async (req, res) => {
  try {
    console.log("Recovering customer:", req.params.id);
    
    const customer = await BillingCustomer.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      isActive: false
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Deleted customer not found" });
    }

    // Reactivate the customer - NO DUPLICATE CHECKS
    customer.isActive = true;
    customer.updatedAt = new Date();
    await customer.save();

    console.log("Customer recovered:", customer._id);

    res.json({
      success: true,
      message: "Customer recovered successfully",
      customer
    });

  } catch (error) {
    console.error("Recover Customer Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Customer summary (for dashboard)
router.get("/summary", verifyBillingToken, async (req, res) => {
  try {
    const customers = await BillingCustomer.find({ 
      companyId: req.companyId,
      isActive: true 
    });
    
    const totalCustomers = customers.length;
    const totalBalance = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const positiveBalance = customers.filter(c => (c.currentBalance || 0) > 0).length;
    const negativeBalance = customers.filter(c => (c.currentBalance || 0) < 0).length;

    res.json({
      totalCustomers,
      totalBalance,
      positiveBalance,
      negativeBalance,
      zeroBalance: totalCustomers - positiveBalance - negativeBalance
    });
  } catch (error) {
    console.error("Customer Summary Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;