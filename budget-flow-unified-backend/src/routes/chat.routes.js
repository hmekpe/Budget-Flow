const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { createRateLimiter } = require("../middlewares/rate-limit.middleware")
const assistantService = require("../services/assistant.service")

const router = express.Router()

const chatRateLimiter = createRateLimiter({
  windowMs: process.env.AI_CHAT_RATE_LIMIT_WINDOW_MS,
  max: process.env.AI_CHAT_RATE_LIMIT_MAX,
  message: "Too many Budget AI requests. Please wait a moment and try again."
})

router.post(
  "/",
  chatRateLimiter,
  asyncHandler(async (req, res) => {
    const response = await assistantService.chat(req.user.id, req.body, {
      authToken: req.authToken,
      month: req.query.month
    })

    res.status(200).json(response)
  })
)

module.exports = router
