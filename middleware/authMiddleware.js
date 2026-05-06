const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return res.status(401).json({ msg: "No token" });
    }

    // 🔥 Remove "Bearer "
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    // verify token
    const decoded = jwt.verify(token, "secretkey");

    req.user = decoded;

    next();
  } catch (err) {
    console.log("Auth Error:", err.message);
    return res.status(401).json({ msg: "Invalid token" });
  }
};