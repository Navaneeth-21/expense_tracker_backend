require("dotenv").config(); // Load environment variables
const app = require("./src/app"); // Import the Express app
const pool = require("./src/config/db"); // Import PostgreSQL pool directly

const PORT = process.env.PORT || 5000;

// Test the database connection before starting the server
(async () => {
  try {
    await pool.connect();
    console.log("Connected to PostgreSQL Database");

    // Start the server only after DB connection is successful
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit process on DB connection failure
  }
})();

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // Exit process on uncaught exception
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error(" Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1); // Exit process on unhandled promise rejection
});
