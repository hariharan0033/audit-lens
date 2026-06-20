require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const logsRouter  = require("./routes/logs");
const statsRouter = require("./routes/stats");
const debugRouter = require("./routes/debug");

const app = express();
const PORT      = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gidy-audit";

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "*",
  methods: ["GET", "POST", "DELETE"],
}));

const uploadLimiter = rateLimit({ windowMs: 60_000, max: 10,
  message: { error: "Too many upload requests. Please wait a minute." } });
const apiLimiter = rateLimit({ windowMs: 60_000, max: 300,
  message: { error: "Too many requests." } });

app.use("/api/logs/upload", uploadLimiter);
app.use("/api", apiLimiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/logs",  logsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/debug", debugRouter);   // ← remove before production

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected:", MONGO_URI);
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
