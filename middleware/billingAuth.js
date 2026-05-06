const jwt = require("jsonwebtoken");
const BillingSession = require("../models/BillingSession");

const verifyBillingToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "billing_secret_key");
    
    // Check if session exists
    const session = await BillingSession.findOne({ token });
    if (!session) {
      return res.status(401).json({ success: false, message: "Invalid or expired session" });
    }

    // Attach user info to request
    req.userId = decoded.id;
    req.companyId = decoded.companyId;
    req.companyName = decoded.companyName;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { verifyBillingToken };