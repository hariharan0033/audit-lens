const express = require("express");
const Log = require("../models/Log");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    // Today at UTC midnight
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    // 6 days before today at UTC midnight
    const windowStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0, 0, 0, 0
    ));

    // Build the 7 day-keys we expect from the aggregation
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 6 + i,
        0, 0, 0, 0
      ));
      return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    });

    console.log(`[stats] server now (UTC): ${now.toISOString()}`);
    console.log(`[stats] windowStart: ${windowStart.toISOString()}`);
    console.log(`[stats] expected day keys:`, days);

    const [
      total,
      bySeverity,
      byStatus,
      byRegion,
      topActors,
      topActions,
      recentActivityRaw,
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

      Log.aggregate([
        {
          $match: {
            timestamp: { $gte: windowStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamp",
                timezone: "UTC",
              },
            },
            count:    { $sum: 1 },
            high:     { $sum: { $cond: [{ $eq: ["$severity", "HIGH"] },     1, 0] } },
            critical: { $sum: { $cond: [{ $eq: ["$severity", "CRITICAL"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    console.log(`[stats] raw aggregation result:`, JSON.stringify(recentActivityRaw));

    // Map aggregation results by date key
    const activityMap = Object.fromEntries(
      recentActivityRaw.map((d) => [d._id, d])
    );

    // Always return exactly 7 entries, zeroing missing days
    const recentActivity = days.map((key) => ({
      _id:      key,
      count:    activityMap[key]?.count    ?? 0,
      high:     activityMap[key]?.high     ?? 0,
      critical: activityMap[key]?.critical ?? 0,
    }));

    console.log(`[stats] filled recentActivity:`, JSON.stringify(recentActivity));

    res.json({
      total,
      bySeverity:     Object.fromEntries(bySeverity.map((d) => [d._id, d.count])),
      byStatus:       Object.fromEntries(byStatus.map((d)   => [d._id, d.count])),
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
