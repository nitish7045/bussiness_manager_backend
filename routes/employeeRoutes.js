const express = require("express");
const router = express.Router();

const Employee = require("../models/Employee");
const auth = require("../middleware/authMiddleware");

// ➕ Add worker
router.post("/add", auth, async (req, res) => {
  try {
    const employee = new Employee({
      ...req.body,
      companyId: req.user.companyId // 🔥 automatic
    });

    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 📄 Get all workers of logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const employees = await Employee.find({
      companyId: req.user.companyId
    });

    res.json(employees);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ✏️ Update worker
router.put("/:id", auth, async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { 
        _id: req.params.id, 
        companyId: req.user.companyId 
      },
      req.body,
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json(employee);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 🗑️ Delete worker
router.delete("/:id", auth, async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId
    });
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json({ message: "Worker deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 📊 Get workers by status (active/inactive)
router.get("/status/:status", auth, async (req, res) => {
  try {
    const employees = await Employee.find({
      companyId: req.user.companyId,
      status: req.params.status
    });
    
    res.json(employees);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 🔄 Reassign/Reactivate worker (change status to active)
router.patch("/:id/reactivate", auth, async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { 
        _id: req.params.id, 
        companyId: req.user.companyId 
      },
      { status: "active" },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json({ message: "Worker reactivated successfully", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 🚫 Deactivate worker (change status to inactive)
router.patch("/:id/deactivate", auth, async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { 
        _id: req.params.id, 
        companyId: req.user.companyId 
      },
      { status: "inactive" },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json({ message: "Worker deactivated successfully", employee });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;