const express = require("express");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const historyLogsServices = require("../services/historyLogsService");
const router = express.Router();

// router.use(auth, restricted("Super", "Admin"));

router.get(
   "/",
   catchAsync(async (req, res, next) => {
      const { page, limit } = req.query;
      const logs = await historyLogsServices.getAll(page, limit);
      res.status(200).json({
         status: "success",
         logs,
      });
   })
);

router.get(
   "/forUser/:userId",
   catchAsync(async (req, res, next) => {
      const { page, limit } = req.query;
      const logs = await historyLogsServices.getForUser(
         req.params.userId,
         page,
         limit
      );
      res.status(200).json({
         status: "success",
         logs,
      });
   })
);

router.get(
   "/one/:id",
   catchAsync(async (req, res, next) => {
      const logs = await historyLogsServices.getForUser(req.params.id);
      if (logs.statusCode)
         return next(logs);
      else
         res.status(200).json({
            status: "success",
            logs,
         });
   })
);

router.post(
   "/byDate",
   catchAsync(async (req, res, next) => {
      const { page, limit } = req.query;
      const { date } = req.body;
      const logs = await historyLogsServices.getByDate(date, page, limit);
      res.status(200).json({
         status: "success",
         logs,
      });
   })
);

router.post(
   "/getHistoryAndCount",
   catchAsync(async (req, res, next) => {
      const { apiName, from, to } = req.body;
      const results = await historyLogsServices.countApiUsageByTopUsers(
         apiName,
         from,
         to
      );

      res.send(results);
   })
);

module.exports = router;
