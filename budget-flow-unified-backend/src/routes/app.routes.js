const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboard.service");

const router = express.Router();

router.get(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const payload = await dashboardService.getBootstrap(req.user.id, req.query.month);
    res.status(200).json(payload);
  })
);

module.exports = router;
