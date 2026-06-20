const express = require("express");
const Log = require("../models/Log");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    // Use Date.UTC to avoid any local-time ambiguity
    const windowStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6,
      0, 0, 0, 0
    ));

    const [total, newest5, oldest5, inLast7Days] = await Promise.all([
      Log.countDocuments(),
      Log.find().sort({ timestamp: -1 }).limit(5).select("timestamp severity").lean(),
      Log.find().sort({ timestamp:  1 }).limit(5).select("timestamp severity").lean(),
      Log.countDocuments({ timestamp: { $gte: windowStart } }),
    ]);

    res.json({
      serverNow:    now.toISOString(),
      windowStart:  windowStart.toISOString(),
      total,
      inLast7Days,
      newest5: newest5.map((d) => ({ ts: new Date(d.timestamp).toISOString(), severity: d.severity })),
      oldest5: oldest5.map((d) => ({ ts: new Date(d.timestamp).toISOString(), severity: d.severity })),
    });
  } catch (err) {
    next(err);
  }
});

// Test date filter: GET /api/debug/date?from=2025-06-19T18:30:00.000Z&to=2025-06-20T18:29:59.999Z
router.get("/date", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    let fromDate, toDate;

    if (from) {
      fromDate = new Date(from);
      if (!isNaN(fromDate)) filter.$gte = fromDate;
    }
    if (to) {
      toDate = new Date(to);
      if (!isNaN(toDate)) filter.$lte = toDate;
    }

    const count = Object.keys(filter).length
      ? await Log.countDocuments({ timestamp: filter })
      : 0;

    res.json({
      received: { from, to },
      parsed: {
        from: fromDate?.toISOString() ?? null,
        to:   toDate?.toISOString()   ?? null,
      },
      matchedCount: count,
    });
  } catch (err) {
    next(err);
  }
});


// Check raw field types of first 3 docs
router.get('/types', async (req, res, next) => {
  try {
    const docs = await Log.collection.find({}).limit(3).toArray();
    res.json(docs.map(d => ({
      _id: d._id,
      timestamp: d.timestamp,
      timestampType: typeof d.timestamp,
      isDate: d.timestamp instanceof Date,
      isoString: d.timestamp ? new Date(d.timestamp).toISOString() : null,
    })));
  } catch(err) { next(err); }
});

// POST /api/debug/fix-timestamps — convert any string timestamps to BSON Date
// Run this once if the 7-day chart is empty despite recent data
router.post('/fix-timestamps', async (req, res, next) => {
  try {
    // Find docs where timestamp is NOT a Date (stored as string)
    const raw = await Log.collection.find({}).toArray();
    const needsFix = raw.filter(d => !(d.timestamp instanceof Date));
    
    if (needsFix.length === 0) {
      return res.json({ message: 'All timestamps are already proper BSON Dates. No fix needed.', fixed: 0 });
    }

    // Bulk update
    const bulkOps = needsFix.map(d => ({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { timestamp: new Date(d.timestamp) } },
      }
    }));

    const result = await Log.collection.bulkWrite(bulkOps, { ordered: false });
    res.json({
      message: `Fixed ${result.modifiedCount} documents with string timestamps.`,
      scanned: raw.length,
      needsFix: needsFix.length,
      fixed: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
