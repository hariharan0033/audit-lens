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
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/gidy-audit";

// ── CORS — before everything else ─────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors()); // handle preflight for all routes

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const uploadLimiter = rateLimit({ windowMs: 60_000, max: 10,
  message: { error: "Too many upload requests." } });
const apiLimiter = rateLimit({ windowMs: 60_000, max: 300,
  message: { error: "Too many requests." } });
app.use("/api/logs/upload", uploadLimiter);
app.use("/api", apiLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/logs",  logsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/debug", debugRouter);
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/", (_req, res) =>
  res.json({ status: "ok", message: "Hello! Server started running" })
);

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── DB connection (cached across Vercel warm invocations) ──────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  console.log("✅ MongoDB connected");
}

// ── Local dev only ─────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)))
    .catch((err) => { console.error("❌", err.message); process.exit(1); });
}

// ── Vercel export — connectDB before each cold start, then hand off to Express
const handler = async (req, res) => {
  await connectDB();
  return app(req, res);
};

module.exports = handler;
