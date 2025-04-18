const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const chatbotRoutes = require("./routes/chatbotRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const staffRoutes = require("./routes/staffRoutes");
const authRoutes = require("./routes/authRoutes");
const propertiesRoutes = require("./routes/propertiesRoutes");
const authenticateToken = require('./middlewares/auth');

// Use routes
app.use("/api", chatbotRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes); // Add authenticateToken middleware
app.use("/api/staff", staffRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/properties", authenticateToken, propertiesRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;