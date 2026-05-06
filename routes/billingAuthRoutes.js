const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const BillingUser = require("../models/BillingUser");
const BillingSession = require("../models/BillingSession");

const router = express.Router();

// Signup with company ID
router.post("/signup", async (req, res) => {
  try {
    console.log("Signup request received:", req.body);
    
    const { username, email, password, fullName, companyName, role } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName || !companyName) {
      return res.status(400).json({ 
        msg: "All fields are required: username, email, password, fullName, companyName" 
      });
    }

    // Check if email already exists
    const existingEmail = await BillingUser.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    // Check if username exists
    const existingUsername = await BillingUser.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ msg: "Username already exists" });
    }

    // Generate unique company ID
    const companyId = `COMP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with company ID
    const newUser = new BillingUser({
      username,
      email,
      password: hashedPassword,
      fullName,
      companyId,
      companyName,
      role: role || "admin"
    });

    await newUser.save();
    console.log("User created successfully:", newUser._id);

    // Generate token
    const token = jwt.sign(
      { 
        id: newUser._id, 
        username: newUser.username, 
        companyId: newUser.companyId,
        companyName: newUser.companyName,
        role: newUser.role 
      },
      process.env.JWT_SECRET || "billing_secret_key",
      { expiresIn: "24h" }
    );

    // Save session
    await BillingSession.create({
      userId: newUser._id,
      token
    });

    res.json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        companyId: newUser.companyId,
        companyName: newUser.companyName,
        role: newUser.role
      }
    });

  } catch (err) {
    console.error("Signup error details:", err);
    res.status(500).json({ 
      msg: "Server error during signup", 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("Login request received:", req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ msg: "Username and password are required" });
    }

    // Find user by username or email
    const user = await BillingUser.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ msg: "Account is disabled. Contact admin." });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token with companyId
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        companyId: user.companyId,
        companyName: user.companyName,
        role: user.role 
      },
      process.env.JWT_SECRET || "billing_secret_key",
      { expiresIn: "24h" }
    );

    // Save session
    await BillingSession.create({
      userId: user._id,
      token
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        companyId: user.companyId,
        companyName: user.companyName,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login error details:", err);
    res.status(500).json({ 
      msg: "Server error during login", 
      error: err.message 
    });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await BillingSession.findOneAndDelete({ token });
    }
    res.json({ success: true, msg: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Verify token
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const session = await BillingSession.findOne({ token }).populate("userId");
    if (!session) {
      return res.status(401).json({ valid: false });
    }

    res.json({
      valid: true,
      user: {
        id: session.userId._id,
        username: session.userId.username,
        email: session.userId.email,
        fullName: session.userId.fullName,
        companyId: session.userId.companyId,
        companyName: session.userId.companyName,
        role: session.userId.role
      }
    });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(401).json({ valid: false });
  }
});

// Get company info
router.get("/company-info", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "No token" });
    }

    const session = await BillingSession.findOne({ token }).populate("userId");
    if (!session) {
      return res.status(401).json({ msg: "Invalid session" });
    }

    const users = await BillingUser.find({ companyId: session.userId.companyId })
      .select("-password");

    res.json({
      companyId: session.userId.companyId,
      companyName: session.userId.companyName,
      users
    });

  } catch (err) {
    console.error("Company info error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;