const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const donationRoutes = require("./routes/donations");
const claimRoutes = require("./routes/claims");
const needRoutes = require("./routes/needs");
const reservationRoutes = require("./routes/reservations");
const matchingRoutes = require("./routes/matching");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5175",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// JSON body parser
app.use(express.json());

// Auth test route
app.get("/api/auth/test", (req, res) => {
  res.json({
    message: "Auth route is working!",
  });
});

// Reservation test route
app.get("/api/reservations/test", (req, res) => {
  res.json({
    message: "Reservation route test working!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/needs", needRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api", reservationRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Community Food Rescue backend is running!",
  });
});

// Server port
const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
}

startServer();