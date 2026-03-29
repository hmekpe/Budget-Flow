const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const settingsService = require("../services/settings.service");

const router = express.Router();

router.get(
  "/bundle",
  asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettingsBundle(req.user.id);
    res.status(200).json({ settings });
  })
);

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await settingsService.getProfile(req.user.id);
    res.status(200).json({ profile });
  })
);

router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await settingsService.updateProfile(req.user.id, req.body);
    res.status(200).json({ profile });
  })
);

router.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    const preferences = await settingsService.getPreferences(req.user.id);
    res.status(200).json({ preferences });
  })
);

router.put(
  "/preferences",
  asyncHandler(async (req, res) => {
    const preferences = await settingsService.updatePreferences(req.user.id, req.body);
    res.status(200).json({ preferences });
  })
);

router.post(
  "/onboarding",
  asyncHandler(async (req, res) => {
    const settings = await settingsService.completeOnboarding(req.user.id, req.body);
    res.status(200).json({ settings });
  })
);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const notifications = await settingsService.getNotifications(req.user.id);
    res.status(200).json({ notifications });
  })
);

router.put(
  "/notifications",
  asyncHandler(async (req, res) => {
    const notifications = await settingsService.updateNotifications(req.user.id, req.body);
    res.status(200).json({ notifications });
  })
);

router.delete(
  "/account",
  asyncHandler(async (req, res) => {
    const result = await settingsService.deleteAccount(req.user.id);
    res.status(200).json(result);
  })
);

module.exports = router;
