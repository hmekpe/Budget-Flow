const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const pushNotificationsService = require("../services/push-notifications.service");

const router = express.Router();

router.post(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const subscription = await pushNotificationsService.registerSubscription(
      req.user.id,
      req.body.subscription,
      req.headers["user-agent"]
    );

    res.status(201).json({ subscription });
  })
);

router.delete(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const result = await pushNotificationsService.unregisterSubscription(
      req.user.id,
      req.body?.endpoint
    );

    res.status(200).json(result);
  })
);

router.post(
  "/test",
  asyncHandler(async (req, res) => {
    const result = await pushNotificationsService.sendTestNotification(req.user.id, req.body);
    res.status(200).json(result);
  })
);

module.exports = router;
