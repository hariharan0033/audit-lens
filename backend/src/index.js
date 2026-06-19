require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const logsRouter = require("./routes/logs");
const statsRouter = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gidy-audit";

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "*",
  methods: ["GET", "POST", "DELETE"],
}));

// Rate limiting for bulk upload (heavier endpoint)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many upload requests. Please wait a minute." },
});

// Standard API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Too many requests." },
});

app.use("/api/logs/upload", uploadLimiter);
app.use("/api", apiLimiter);

// Body parsing — allow large payloads for bulk upload (10k records)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/logs", logsRouter);
app.use("/api/stats", statsRouter);

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Connect to MongoDB then start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
