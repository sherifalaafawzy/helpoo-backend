const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const brokerService = require("../services/BrokerServices");
const router = express.Router();

router.get(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      const brokers = await brokerService.getAll();
      res.status(200).json({
         status: "success",
         brokers,
      });
   })
);

module.exports = router;
