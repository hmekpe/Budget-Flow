const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const budgetsService = require("../services/budgets.service");

const router = express.Router();

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    const budget = await budgetsService.getCurrentBudget(req.user.id, req.query.month);
    res.status(200).json(budget);
  })
);

router.put(
  "/current",
  asyncHandler(async (req, res) => {
    const budget = await budgetsService.setCurrentBudget(req.user.id, req.body);
    res.status(200).json(budget);
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const items = await budgetsService.listBudgetCategories(req.user.id, req.query.month);
    res.status(200).json({
      items,
      total: items.length
    });
  })
);

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const category = await budgetsService.addBudgetCategory(req.user.id, req.body);
    res.status(201).json({ category });
  })
);

router.put(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const category = await budgetsService.updateBudgetCategory(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    res.status(200).json({ category });
  })
);

router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const result = await budgetsService.deleteBudgetCategory(req.user.id, Number(req.params.id));
    res.status(200).json(result);
  })
);

router.post(
  "/categories/:id/log-spend",
  asyncHandler(async (req, res) => {
    const category = await budgetsService.logBudgetSpend(req.user.id, Number(req.params.id), req.body);
    res.status(200).json({ category });
  })
);

router.post(
  "/categories/:id/correct-spend",
  asyncHandler(async (req, res) => {
    const category = await budgetsService.correctBudgetSpend(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    res.status(200).json({ category });
  })
);

module.exports = router;
