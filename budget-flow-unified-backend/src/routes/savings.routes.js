const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const savingsService = require("../services/savings.service");

const router = express.Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await savingsService.getSavingsSummary(req.user.id);
    res.status(200).json(summary);
  })
);

router.get(
  "/goals",
  asyncHandler(async (req, res) => {
    const items = await savingsService.listGoals(req.user.id);
    res.status(200).json({
      items,
      total: items.length
    });
  })
);

router.post(
  "/goals",
  asyncHandler(async (req, res) => {
    const goal = await savingsService.createGoal(req.user.id, req.body);
    res.status(201).json({ goal });
  })
);

router.put(
  "/goals/:id",
  asyncHandler(async (req, res) => {
    const goal = await savingsService.updateGoal(req.user.id, Number(req.params.id), req.body);
    res.status(200).json({ goal });
  })
);

router.delete(
  "/goals/:id",
  asyncHandler(async (req, res) => {
    const result = await savingsService.deleteGoal(req.user.id, Number(req.params.id));
    res.status(200).json(result);
  })
);

router.post(
  "/goals/:id/deposit",
  asyncHandler(async (req, res) => {
    const goal = await savingsService.depositToGoal(req.user.id, Number(req.params.id), req.body);
    res.status(200).json({ goal });
  })
);

router.post(
  "/goals/:id/withdraw",
  asyncHandler(async (req, res) => {
    const goal = await savingsService.withdrawFromGoal(req.user.id, Number(req.params.id), req.body);
    res.status(200).json({ goal });
  })
);

module.exports = router;
