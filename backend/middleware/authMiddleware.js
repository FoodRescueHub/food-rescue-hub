
const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Please provide a token.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Token is missing.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    // Reject tokens that have already been logged out.
    const blacklistedToken = await TokenBlacklist.exists({ token });

    if (blacklistedToken) {
      return res.status(401).json({
        message: "You have logged out. Please log in again.",
      });
    }

    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token. Please log in again.",
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication service error.",
    });
  }
};

module.exports = authenticateToken;

