const express = require("express");
const BillingInvoice = require("../models/BillingInvoice");
const BillingCustomer = require("../models/BillingCustomer");
const BillingProduct = require("../models/BillingProduct");
const { verifyBillingToken } = require("../middleware/billingAuth");

const router = express.Router();

// Generate invoice number
const generateInvoiceNumber = async (companyId) => {
  const lastInvoice = await BillingInvoice.findOne({ companyId })
    .sort({ createdAt: -1 });
  
  if (!lastInvoice) {
    return `INV-${Date.now()}`;
  }
  
  const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[1]) || 0;
  return `INV-${lastNum + 1}`;
};

// Get all invoices for company
router.get("/", verifyBillingToken, async (req, res) => {
  try {
    const invoices = await BillingInvoice.find({ companyId: req.companyId })
      .populate("customerId", "name phone")
      .populate("createdBy", "username fullName")
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get single invoice
router.get("/:id", verifyBillingToken, async (req, res) => {
  try {
    const invoice = await BillingInvoice.findOne({
      _id: req.params.id,
      companyId: req.companyId
    }).populate("customerId").populate("createdBy");
    
    if (!invoice) return res.status(404).json({ msg: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Create invoice
router.post("/", verifyBillingToken, async (req, res) => {
  try {
    const { customerId, items, dueDate, notes, paymentMethod } = req.body;

    // Get customer
    const customer = await BillingCustomer.findOne({
      _id: customerId,
      companyId: req.companyId
    });
    if (!customer) {
      return res.status(404).json({ msg: "Customer not found" });
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = [];

    for (const item of items) {
      const product = await BillingProduct.findOne({
        _id: item.productId,
        companyId: req.companyId
      });

      if (!product) {
        return res.status(404).json({ msg: `Product not found: ${item.productId}` });
      }

      const quantity = item.quantity;
      const unitPrice = product.unitPrice;
      const discount = item.discount || 0;
      const taxRate = product.taxRate;

      const itemTotal = quantity * unitPrice;
      const itemDiscount = (itemTotal * discount) / 100;
      const taxableAmount = itemTotal - itemDiscount;
      const taxAmount = (taxableAmount * taxRate) / 100;
      const finalTotal = taxableAmount + taxAmount;

      subtotal += itemTotal;
      totalDiscount += itemDiscount;
      totalTax += taxAmount;

      processedItems.push({
        productId: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        unitPrice,
        discount,
        taxRate,
        taxAmount,
        total: finalTotal
      });
    }

    const totalAmount = subtotal - totalDiscount + totalTax;
    const invoiceNumber = await generateInvoiceNumber(req.companyId);

    const invoice = new BillingInvoice({
      companyId: req.companyId,
      invoiceNumber,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerGST: customer.gstNumber,
      invoiceDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: processedItems,
      subtotal,
      totalDiscount,
      totalTax,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      paymentStatus: "unpaid",
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
      createdBy: req.userId
    });

    await invoice.save();

    // Update customer balance
    customer.currentBalance += totalAmount;
    customer.totalPurchases += totalAmount;
    await customer.save();

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Invoice creation error:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Update payment
router.patch("/:id/payment", verifyBillingToken, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    const invoice = await BillingInvoice.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!invoice) {
      return res.status(404).json({ msg: "Invoice not found" });
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const newBalanceDue = invoice.totalAmount - newAmountPaid;

    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = newBalanceDue;
    invoice.paymentStatus = newBalanceDue === 0 ? "paid" : "partial";
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    invoice.updatedAt = new Date();

    await invoice.save();

    // Update customer balance
    const customer = await BillingCustomer.findOne({
      _id: invoice.customerId,
      companyId: req.companyId
    });
    if (customer) {
      customer.currentBalance = customer.currentBalance - amount;
      await customer.save();
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete invoice
router.delete("/:id", verifyBillingToken, async (req, res) => {
  try {
    const invoice = await BillingInvoice.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });
    
    if (!invoice) return res.status(404).json({ msg: "Invoice not found" });
    
    // Reverse customer balance
    const customer = await BillingCustomer.findOne({
      _id: invoice.customerId,
      companyId: req.companyId
    });
    if (customer) {
      customer.currentBalance -= invoice.totalAmount;
      customer.totalPurchases -= invoice.totalAmount;
      await customer.save();
    }
    
    res.json({ msg: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;