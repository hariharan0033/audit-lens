const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Resolved", "Unresolved", "Investigating"],
      default: "Unresolved",
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    // Use the log's own timestamp as the document timestamp, not auto-generated
    timestamps: false,
    // Optimize read performance
    versionKey: false,
  }
);

// Compound index for common filter combos
logSchema.index({ severity: 1, status: 1 });
logSchema.index({ actor: 1, timestamp: -1 });
logSchema.index({ timestamp: -1, severity: 1 });

// Full-text search index on actor, action, resource, ipAddress
logSchema.index(
  { actor: "text", action: "text", resource: "text", ipAddress: "text", role: "text" },
  { name: "logs_text_search" }
);

module.exports = mongoose.model("Log", logSchema);
