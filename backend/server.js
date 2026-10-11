
const express = require("express");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected"); // NEW
const donationRoutes = require("./routes/donations");
const claimRoutes = require("./routes/claims");

const app = express();

app.use(express.json());

app.get("/api/auth/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes); // NEW
app.use("/api/donations", donationRoutes);
app.use("/api/claims", claimRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Community Food Rescue backend is running!" });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
