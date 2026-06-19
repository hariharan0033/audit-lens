const express = require("express");
const Log = require("../models/Log");

const router = express.Router();

// GET /api/stats — summary aggregations for dashboard cards
router.get("/", async (req, res, next) => {
  try {
    const [
      total,
      bySeverity,
      byStatus,
      byRegion,
      topActors,
      topActions,
      recentActivity,
    ] = await Promise.all([
      Log.countDocuments(),

      Log.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Log.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Log.aggregate([
        { $group: { _id: "$region", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      Log.aggregate([
        { $group: { _id: "$actor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      Log.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Last 7 days activity by day
      Log.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            count: { $sum: 1 },
            high: {
              $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] },
            },
            critical: {
              $sum: { $cond: [{ $eq: ["$severity", "CRITICAL"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      total,
      bySeverity: Object.fromEntries(bySeverity.map((d) => [d._id, d.count])),
      byStatus: Object.fromEntries(byStatus.map((d) => [d._id, d.count])),
      byRegion,
      topActors,
      topActions,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
