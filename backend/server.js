const express = require("express");
const collectionAgentRoutes = require("./routes/collectionAgent");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const donationRoutes = require("./routes/donations");
const claimRoutes = require("./routes/claims");
const needRoutes = require("./routes/needs");
const reservationRoutes = require("./routes/reservations");
const pickupRoutes = require("./routes/pickups");
const handoverRoutes = require("./routes/handovers");
const policyRoutes = require("./routes/policies");

const app = express();

app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5175",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/collection-agent", collectionAgentRoutes);

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

// Pickup test route
app.get("/api/pickups/test", (req, res) => {
  res.json({
    message: "Pickup route test working!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/needs", needRoutes);
app.use("/api", reservationRoutes);
app.use("/api/pickups", pickupRoutes);
app.use("/api", handoverRoutes);
app.use("/api", policyRoutes);

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
