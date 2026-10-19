// ── DNS override (Node v26 / Windows SRV lookup workaround) ──────────────────
// Node's default resolver refuses SRV queries on this network configuration.
// Must be set before any require that triggers a network connection.
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

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
const organizationRoutes = require("./routes/organizations");
const membershipRoutes = require("./routes/memberships");

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
app.use("/api", reservationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/memberships", membershipRoutes);

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