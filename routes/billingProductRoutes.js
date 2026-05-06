const express = require("express");
const BillingProduct = require("../models/BillingProduct");
const { verifyBillingToken } = require("../middleware/billingAuth");

const router = express.Router();

// Helper: Get next product ID for a specific company
async function getNextProductId(companyId) {
  const lastProduct = await BillingProduct.findOne({ companyId }).sort({ productId: -1 });
  return lastProduct ? lastProduct.productId + 1 : 1;
}

// Helper: Generate product code
function generateProductCode(productId) {
  return `P${String(productId).padStart(4, '0')}`;
}

// GET: All products for logged-in company
router.get("/", verifyBillingToken, async (req, res) => {
  try {
    const products = await BillingProduct.find({ companyId: req.companyId })
      .sort({ productId: 1 });
    
    res.json(products);
  } catch (error) {
    console.error("GET Products Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Single product by ID
router.get("/:id", verifyBillingToken, async (req, res) => {
  try {
    const product = await BillingProduct.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    res.json(product);
  } catch (error) {
    console.error("GET Product Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Create new product
router.post("/", verifyBillingToken, async (req, res) => {
  try {
    const { name, unit, unitPrice } = req.body;
    const companyId = req.companyId;

    // Validation
    if (!name || !unitPrice) {
      return res.status(400).json({ 
        success: false, 
        message: "Product name and price are required" 
      });
    }

    // Check if product with same name exists for this company
    const existingProduct = await BillingProduct.findOne({
      companyId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingProduct) {
      return res.status(400).json({ 
        success: false, 
        message: `Product "${name}" already exists for your company` 
      });
    }

    // Get next product ID for this company
    const nextId = await getNextProductId(companyId);
    const productCode = generateProductCode(nextId);

    // Create new product
    const product = new BillingProduct({
      companyId,
      productId: nextId,
      productCode,
      name: name.trim(),
      unit: unit || "NOS",
      unitPrice: parseFloat(unitPrice)
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product
    });

  } catch (error) {
    console.error("POST Product Error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Product name already exists for your company" 
      });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT: Update product
router.put("/:id", verifyBillingToken, async (req, res) => {
  try {
    const { name, unit, unitPrice } = req.body;
    const companyId = req.companyId;

    // Find product belonging to this company
    const product = await BillingProduct.findOne({
      _id: req.params.id,
      companyId
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if new name conflicts with another product (excluding current)
    if (name && name !== product.name) {
      const existingProduct = await BillingProduct.findOne({
        companyId,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingProduct) {
        return res.status(400).json({ 
          success: false, 
          message: `Product "${name}" already exists for your company` 
        });
      }
    }

    // Update fields
    if (name) product.name = name.trim();
    if (unit) product.unit = unit;
    if (unitPrice) product.unitPrice = parseFloat(unitPrice);
    product.updatedAt = new Date();

    await product.save();

    res.json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (error) {
    console.error("PUT Product Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Remove product
router.delete("/:id", verifyBillingToken, async (req, res) => {
  try {
    const product = await BillingProduct.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("DELETE Product Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Delete all products for a company (admin only - for testing)
router.delete("/company/all", verifyBillingToken, async (req, res) => {
  try {
    const result = await BillingProduct.deleteMany({ companyId: req.companyId });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} products for your company`
    });
  } catch (error) {
    console.error("DELETE All Products Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;