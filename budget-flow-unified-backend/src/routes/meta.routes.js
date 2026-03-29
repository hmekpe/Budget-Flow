const express = require("express");
const metaService = require("../services/meta.service");
const exchangeRatesService = require("../services/exchange-rates.service");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json(metaService.getMeta());
});

router.get("/exchange-rate", async (req, res, next) => {
  try {
    const payload = await exchangeRatesService.getExchangeRate(req.query.base, req.query.target);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
