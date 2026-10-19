
const dns = require("dns");
const mongoose = require("mongoose");

// Use public DNS servers to resolve MongoDB Atlas SRV records on Windows
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
