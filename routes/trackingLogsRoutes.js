const express = require("express");
const trackingLogsService = require("../services/TrackingLogsService");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

router.post(
   "/",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create role'] = {
            "in": "body",
            schema: {
                "name": "Admin",
            }
        }
    */
      const newTrackingLog = await trackingLogsService.createTrackingLog(
         req.body
      );
      if (newTrackingLog.statusCode) {
         return next(newTrackingLog);
      }
      res.status(201).json({
         status: "success",
         role: newTrackingLog,
      });
   })
);

router.get(
   "/",
   catchAsync(async (req, res, next) => {
      const trackings = await trackingLogsService.getAll();
      res.status(200).json({
         status: "success",
         trackings,
      });
   })
);

module.exports = router;
