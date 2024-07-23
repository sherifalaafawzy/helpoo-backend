const express = require("express");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const auth = require("../middlewares/auth");
const restricted = require("../middlewares/restriction");
const ratingTypeService = require("../services/service_requests/RatingTypeService");

const router = express.Router();

router.post(
   "/create",
   catchAsync(async (req, res, next) => {
      const ratingType = await ratingTypeService.createRatingType(req.body);
      if (ratingType.statusCode) {
         return next(ratingType);
      }
      res.status(201).json({
         status: "success",
         ratingType,
      });
   })
);

router.get(
   "/getAll",
   catchAsync(async (req, res, next) => {
      const ratingTypes = await ratingTypeService.getAllRatingTypes();
      if (ratingTypes.statusCode) {
         return next(ratingTypes);
      }
      res.status(200).json({
         status: "success",
         ...ratingTypes,
      });
   })
);

router.get(
   "/:ratingTypeId",
   catchAsync(async (req, res, next) => {
      const ratingType = await ratingTypeService.getARatingType(
         req.params.ratingTypeId
      );
      if (ratingType.statusCode) {
         return next(ratingType);
      }
      res.status(200).json({
         status: "success",
         ratingType,
      });
   })
);

router.delete(
   "/deleteOne",
   catchAsync(async (req, res, next) => {
      const ratingType = await ratingTypeService.deleteRatingType(
         Number(req.params.ratingTypeId)
      );
      if (ratingType.statusCode) {
         return next(ratingType);
      }
      res.status(200).json({
         status: "success",
      });
   })
);

router.patch(
   "/edit",
   catchAsync(async (req, res, next) => {
      const ratingTypeId = req.body.ratingTypeId;
      const updateRatingType = await ratingTypeService.updateRatingType({
         data: req.body,
         ratingTypeId,
      });
      if (updateRatingType.statusCode) {
         
         return next(updateRatingType);
      }
      const ratingType = await ratingTypeService.getARatingType(ratingTypeId);
      res.status(200).json({
         status: "success",
         ratingType,
      });
   })
);

module.exports = router;
