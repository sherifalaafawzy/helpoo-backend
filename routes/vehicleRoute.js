const express = require("express");
const auth = require("../middlewares/auth");
const restriction = require("../middlewares/restriction");
const catchAsync = require("../utils/catchAsync");
const vehicleService = require("../services/vehicleService");

const router = express.Router();

router.post(
   "/create",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['create vehicle'] = {
            in: 'body',
            schema: {
                $Vec_plate: "Vec_plate",
                $Vec_num: "Vec_num",
                $IMEI: "IMEI",
                $carServiceType: "carServiceType",
            }
        }
    */
      const vehicle = await vehicleService.createVehicle(req.body);
      if (vehicle.statusCode) {
         return next(vehicle);
      } else {
         res.status(201).json({
            status: "success",
            vehicle,
         });
      }
   })
);

router.get(
   "/vehicleStats",
   auth,
   catchAsync(async (req, res, next) => {
      let stats = await vehicleService.vehicleStats();
      res.status(200).json({
         status: "success",
         stats,
      });
   })
);

router.patch(
   "/updateVehicle/:id",
   auth,
   restriction("Admin", "Super"),
   catchAsync(async (req, res, next) => {
      const vehicle = await vehicleService.updateVehicleData(
         req.params.id,
         req.body
      );
      if (vehicle.statusCode) return next(vehicle);
      else
         res.status(200).json({
            status: "success",
            vehicle,
         });
   })
);

router.get(
   "/vecTypes",
   auth,
   catchAsync(async (req, res, next) => {
      const types = await vehicleService.getAllTypes();
      res.status(200).json({
         status: "success",
         types,
      });
   })
);

router.get(
   "/",
   /*auth , restriction, */ catchAsync(async (req, res, next) => {
      const vehicles = await vehicleService.getAllVehicles();
      res.status(200).json({
         status: "success",
         vehicles,
      });
   })
);

router.get(
   "/availableVehicles",
   /*auth , restriction, */ catchAsync(async (req, res, next) => {
      const vehicles = await vehicleService.getAllAvailableVehicles([1, 2, 3]);
      if (vehicles.statusCode) {
         return next(vehicles);
      }
      res.status(200).json({
         status: "success",
         vehicles,
      });
   })
);

module.exports = router;
