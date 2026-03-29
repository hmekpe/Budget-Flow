const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const transactionsService = require("../services/transactions.service");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await transactionsService.listTransactions(req.user.id, req.query);
    res.status(200).json({
      items,
      total: items.length
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const transaction = await transactionsService.createTransaction(req.user.id, req.body);
    res.status(201).json({ transaction });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await transactionsService.deleteTransaction(req.user.id, Number(req.params.id));
    res.status(200).json(result);
  })
);

module.exports = router;
