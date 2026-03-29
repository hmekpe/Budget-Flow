const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboard.service");

const router = express.Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await dashboardService.getDashboardSummary(req.user.id, req.query.month);
    res.status(200).json(summary);
  })
);

module.exports = router;
