const express = require("express");
const catchAsync = require("../utils/catchAsync");
const countrySerivces = require("../services/countryServices");

const router = express.Router();

router.get(
   "/cities",
   catchAsync(async (req, res, next) => {
      const cities = await countrySerivces.getAllCities();
      res.status(200).json({
         status: "success",
         cities,
      });
   })
);

router.get(
   "/districts",
   catchAsync(async (req, res, next) => {
      const districts = await countrySerivces.getAllDistrict();
      res.status(200).json({
         status: "success",
         districts,
      });
   })
);

router.get(
   "/districtsByCity/:id",
   catchAsync(async (req, res, next) => {
      const districts = await countrySerivces.getDistrictsByCity(req.params.id);
      res.status(200).json({
         status: "success",
         districts,
      });
   })
);

module.exports = router;
