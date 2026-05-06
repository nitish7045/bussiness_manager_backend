const express = require("express");
const auth = require("../middleware/authMiddleware");
const Employee = require("../models/Employee");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();

// Upload profile photo to Cloudinary
router.post("/upload-profile/:employeeId", auth, async (req, res) => {
  try {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({ msg: "No photo data provided" });
    }
    
    // Check if photo is valid Base64
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ msg: "Invalid image format" });
    }
    
    console.log(`Uploading profile photo for employee: ${req.params.employeeId}`);
    
    // Upload to Cloudinary with optimizations
    const result = await cloudinary.uploader.upload(photo, {
      folder: `workers/profile/${req.params.employeeId}`,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }
      ],
      format: "jpg"
    });
    
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.employeeId, companyId: req.user.companyId },
      { profilePhoto: result.secure_url },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ msg: "Employee not found" });
    }
    
    console.log(`Profile photo uploaded successfully for ${employee.name}`);
    
    res.json({ 
      msg: "Profile photo uploaded successfully", 
      photoUrl: employee.profilePhoto 
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    
    // Handle specific Cloudinary errors
    if (err.message.includes('File size too large')) {
      return res.status(400).json({ msg: "Image too large. Maximum size is 5MB." });
    }
    
    res.status(500).json({ msg: "Error uploading photo to cloud" });
  }
});

// Upload Aadhaar photo to Cloudinary
router.post("/upload-aadhaar/:employeeId", auth, async (req, res) => {
  try {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({ msg: "No photo data provided" });
    }
    
    // Check if photo is valid Base64
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ msg: "Invalid image format" });
    }
    
    console.log(`Uploading Aadhaar photo for employee: ${req.params.employeeId}`);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(photo, {
      folder: `workers/aadhaar/${req.params.employeeId}`,
      transformation: [
        { width: 800, height: 600, crop: "limit", quality: "auto" }
      ]
    });
    
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.employeeId, companyId: req.user.companyId },
      { aadhaarPhoto: result.secure_url },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ msg: "Employee not found" });
    }
    
    console.log(`Aadhaar photo uploaded successfully for ${employee.name}`);
    
    res.json({ 
      msg: "Aadhaar photo uploaded successfully", 
      photoUrl: employee.aadhaarPhoto 
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    
    if (err.message.includes('File size too large')) {
      return res.status(400).json({ msg: "Image too large. Maximum size is 5MB." });
    }
    
    res.status(500).json({ msg: "Error uploading photo to cloud" });
  }
});

// Delete photo from Cloudinary
router.delete("/delete-photo/:employeeId/:photoType", auth, async (req, res) => {
  try {
    const { employeeId, photoType } = req.params;
    const employee = await Employee.findOne({ 
      _id: employeeId, 
      companyId: req.user.companyId 
    });
    
    if (!employee) {
      return res.status(404).json({ msg: "Employee not found" });
    }
    
    const photoUrl = photoType === "profile" ? employee.profilePhoto : employee.aadhaarPhoto;
    
    if (photoUrl) {
      // Extract public ID from Cloudinary URL
      const publicId = photoUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted photo from Cloudinary: ${publicId}`);
    }
    
    const updateField = photoType === "profile" ? "profilePhoto" : "aadhaarPhoto";
    employee[updateField] = null;
    await employee.save();
    
    res.json({ msg: "Photo deleted successfully" });
  } catch (err) {
    console.error("Error deleting photo:", err);
    res.status(500).json({ msg: "Error deleting photo" });
  }
});

module.exports = router;