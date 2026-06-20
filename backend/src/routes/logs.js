const express = require("express");
const { body, query, param, validationResult } = require("express-validator");
const Log = require("../models/Log");

const router = express.Router();

// Helper: send validation errors
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// POST /api/logs/upload  — bulk insert up to 10,000 records
// ─────────────────────────────────────────────
router.post(
  "/upload",
  body().isArray({ min: 1, max: 10000 }).withMessage("Body must be an array of 1–10,000 records"),
  body("*.actor").isString().notEmpty(),
  body("*.role").isString().notEmpty(),
  body("*.action").isString().notEmpty(),
  body("*.resource").isString().notEmpty(),
  body("*.resourceType").isString().notEmpty(),
  body("*.ipAddress").isString().notEmpty(),
  body("*.region").isString().notEmpty(),
  body("*.severity").isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  body("*.timestamp").isISO8601(),
  async (req, res, next) => {
    if (validate(req, res)) return;
    try {
      // Explicitly cast timestamp to Date so MongoDB stores it as BSON Date, not string
      const records = req.body.map((r) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      const result = await Log.insertMany(records, {
        ordered: false,
        lean: true,
      });
      res.status(201).json({
        message: `Inserted ${result.length} of ${records.length} records`,
        inserted: result.length,
        total: records.length,
      });
    } catch (err) {
      // BulkWriteError — some docs may still have been inserted
      if (err.name === "MongoBulkWriteError") {
        return res.status(207).json({
          message: "Partial insert",
          inserted: err.result?.nInserted ?? 0,
          errors: err.writeErrors?.length ?? 0,
        });
      }
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/logs — list with filter, search, sort, paginate (all server-side)
// ─────────────────────────────────────────────
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  query("sortBy").optional().isString(),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  query("search").optional().isString().trim(),
  query("severity").optional().isString(),
  query("status").optional().isString(),
  query("role").optional().isString(),
  query("region").optional().isString(),
  query("resourceType").optional().isString(),
  query("action").optional().isString(),
  query("actor").optional().isString(),
  query("from").optional().isString(),
  query("to").optional().isString(),
  async (req, res, next) => {
    if (validate(req, res)) return;
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "timestamp",
        sortOrder = "desc",
        search,
        severity,
        status,
        role,
        region,
        resourceType,
        action,
        actor,
        from,
        to,
      } = req.query;

      // Build MongoDB filter
      const filter = {};

      // Exact/enum filters
      if (severity) filter.severity = { $in: severity.split(",") };
      if (status) filter.status = { $in: status.split(",") };
      if (role) filter.role = { $in: role.split(",") };
      if (region) filter.region = { $in: region.split(",") };
      if (resourceType) filter.resourceType = { $in: resourceType.split(",") };
      if (action) filter.action = { $in: action.split(",") };
      if (actor) filter.actor = { $regex: actor, $options: "i" };

      // Date range
      if (from || to) {
        filter.timestamp = {};
        if (from) {
          const fromDate = new Date(from);
          console.log('[logs] from raw=' + from + ' parsed=' + fromDate.toISOString() + ' valid=' + !isNaN(fromDate));
          if (!isNaN(fromDate)) filter.timestamp.$gte = fromDate;
        }
        if (to) {
          const toDate = new Date(to);
          console.log('[logs] to raw=' + to + ' parsed=' + toDate.toISOString() + ' valid=' + !isNaN(toDate));
          if (!isNaN(toDate)) filter.timestamp.$lte = toDate;
        }
        if (!filter.timestamp.$gte && !filter.timestamp.$lte) delete filter.timestamp;
        console.log('[logs] filter.timestamp:', JSON.stringify(filter.timestamp));
      }

      // Full-text search (uses the text index)
      if (search) {
        filter.$text = { $search: search };
      }

      // Sort
      const allowedSortFields = [
        "timestamp", "actor", "role", "action", "severity", "status", "region", "resourceType",
      ];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "timestamp";
      const sort = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };

      // If text search, also sort by text score
      if (search) {
        sort.score = { $meta: "textScore" };
      }

      const skip = (page - 1) * limit;

      // Run query and count in parallel
      const [logs, total] = await Promise.all([
        Log.find(filter, search ? { score: { $meta: "textScore" } } : {})
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Log.countDocuments(filter),
      ]);

      res.json({
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/logs/:id — single log detail
// ─────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isMongoId(),
  async (req, res, next) => {
    if (validate(req, res)) return;
    try {
      const log = await Log.findById(req.params.id).lean();
      if (!log) return res.status(404).json({ error: "Log not found" });
      res.json(log);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/logs/:id — delete a single log
// ─────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isMongoId(),
  async (req, res, next) => {
    if (validate(req, res)) return;
    try {
      const log = await Log.findByIdAndDelete(req.params.id);
      if (!log) return res.status(404).json({ error: "Log not found" });
      res.json({ message: "Log deleted", id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/logs — delete all logs (useful for re-testing)
// ─────────────────────────────────────────────
router.delete("/", async (req, res, next) => {
  try {
    const result = await Log.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} logs` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
