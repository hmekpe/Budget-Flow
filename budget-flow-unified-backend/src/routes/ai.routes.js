const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const aiDataService = require("../services/ai-data.service")

const router = express.Router()

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const payload = await aiDataService.getSummary(req.user.id, req.query.month)
    res.status(200).json(payload)
  })
)

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const payload = await aiDataService.getCategories(req.user.id, req.query.month)
    res.status(200).json(payload)
  })
)

router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const payload = await aiDataService.getTransactions(req.user.id, req.query)
    res.status(200).json(payload)
  })
)

router.get(
  "/insights",
  asyncHandler(async (req, res) => {
    const payload = await aiDataService.getInsights(req.user.id, req.query.month)
    res.status(200).json(payload)
  })
)

module.exports = router
