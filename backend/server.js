// server.js - Quality Control System Backend

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// const helmet = require("helmet"); // ❌ ปิด Helmet ชั่วคราว
const morgan = require("morgan");
const compression = require("compression");

// --- 1. Import connectDB ---
const { connectDB } = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const apiRoutes = require("./routes/api");
// ✅ Import Inspection Routes
const inspectionRoutes = require("./routes/inspectionRoutes"); 
const calibrationRoutes = require('./routes/calibrationRoutes');
const hardnessRoutes = require('./routes/hardnessRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---

// ✅ ใช้แบบนี้บรรทัดเดียวจบ (ปลดล็อกทุกอย่าง 100%)
app.use(cors({ origin: '*' })); 

app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static("uploads"));

// --- Main API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ✅ เปิดใช้งาน Inspection Routes
app.use("/api/v1/inspections", inspectionRoutes);
app.use('/api/calibration', calibrationRoutes);
// Mount routes
app.use('/api/hardness', hardnessRoutes);
// General API Routes
app.use("/api/v1", apiRoutes);

// --- System Routes ---
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Quality Control System Backend is running!",
    timestamp: new Date().toISOString(),
  });
});
// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:", err.stack);
  res.status(500).json({
    success: false,
    message: "An internal server error occurred.",
  });
});
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});
// --- Start Server Function ---
const startServer = async () => {
  try {
    await connectDB();
      app.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 Quality Control System Backend");
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("✅ CORS: Allow ALL (*)");
      console.log("✅ HELMET: Disabled");
      
      console.log("\n📍 Mounted Routes:");
      console.log("   • /api/auth");
      console.log("   • /api/admin");
      console.log("   • /api/v1/inspections");
      
      console.log("   • /health\n");
    });
  } catch (error) {
    console.error(
      "❌ Could not start server. Database connection failed.",
      error
    );
    process.exit(1);
  }   
};
startServer();
module.exports = app;