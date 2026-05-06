const express = require("express");
const BillingProduct = require("../models/BillingProduct");
const BillingCustomer = require("../models/BillingCustomer");
const BillingInvoice = require("../models/BillingInvoice");
const { verifyBillingToken } = require("../middleware/billingAuth");

const router = express.Router();

// Get dashboard stats
router.get("/dashboard", verifyBillingToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get counts
    const totalProducts = await BillingProduct.countDocuments({ companyId: req.companyId });
    const totalCustomers = await BillingCustomer.countDocuments({ companyId: req.companyId });
    
    // Get invoice stats
    const invoices = await BillingInvoice.find({ companyId: req.companyId });
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalDue = totalRevenue - totalPaid;
    
    // Get this month's revenue
    const thisMonthInvoices = await BillingInvoice.find({
      companyId: req.companyId,
      invoiceDate: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const monthlyRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    
    // Get low stock products
    const lowStockProducts = await BillingProduct.find({
      companyId: req.companyId,
      quantity: { $lt: 10 },
      isActive: true
    }).limit(5);
    
    // Get recent invoices
    const recentInvoices = await BillingInvoice.find({ companyId: req.companyId })
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      totalProducts,
      totalCustomers,
      totalInvoices,
      totalRevenue,
      totalPaid,
      totalDue,
      monthlyRevenue,
      lowStockProducts: lowStockProducts.length,
      recentInvoices
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Get revenue chart data
router.get("/revenue-chart", verifyBillingToken, async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(targetYear, month - 1, 1);
      const endDate = new Date(targetYear, month, 0);
      
      const invoices = await BillingInvoice.find({
        companyId: req.companyId,
        invoiceDate: { $gte: startDate, $lte: endDate }
      });
      
      const revenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      
      monthlyData.push({
        month,
        revenue,
        paid,
        due: revenue - paid
      });
    }
    
    res.json({ year: targetYear, data: monthlyData });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;