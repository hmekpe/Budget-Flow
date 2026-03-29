const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const reportsService = require("../services/reports.service");

const router = express.Router();

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    const report = await reportsService.getCurrentReport(req.user.id, req.query.month);
    res.status(200).json(report);
  })
);

module.exports = router;
