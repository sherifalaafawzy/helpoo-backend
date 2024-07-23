const express = require("express");
const auth = require("../middlewares/auth");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");

const accidentTypesService = require("../services/AccidentTypes");
router.get(
   "/",
   auth,
   catchAsync(async (req, res, next) => {
      let types = await accidentTypesService.getAllAccidentTypes();
      res.status(200).json({
         status: "success",
         types,
      });
   })
);
router.post(
   "/images",
   auth,
   catchAsync(async (req, res, next) => {
      let { accidentTypesIds, inspection, inspectionId } = req.body;
      let requiredImages = await accidentTypesService.getImagesList(
         accidentTypesIds,
         inspection,
         inspectionId
      );
      if (requiredImages.statusCode) return next(requiredImages);
      res.status(200).json({
         status: "success",
         requiredImages,
      });
   })
);

module.exports = router;
