const express = require("express");
const axios = require("axios");

const driverService = require("../services/DriverService");
const vehicleService = require("../services/vehicleService");

const driverFunctions = require("../services/DriverFunctions");

const restricted = require("../middlewares/restriction");
const auth = require("../middlewares/auth");
const catchAsync = require("../utils/catchAsync");
const Roles = require("../enums/Roles");
const AppError = require("../utils/AppError");

const router = express.Router();

// router.post(
//    "/checkNewCalc",
//    auth,
//    catchAsync(async (req, res, next) => {
//       let { carServiceTypeId, requestId, driverId } = req.body;
//       if (!carServiceTypeId || !requestId || !driverId) {
//          return next(
//             new AppError(
//                "Please send requestId, driverId and carServiceTypeId",
//                400
//             )
//          );
//       }
//       let pricing = await driverService.checkNewPricing(
//          carServiceTypeId,
//          requestId,
//          driverId
//       );
//       if (pricing.statusCode) {
//          return next(pricing);
//       }
//       res.status(200).json({
//          status: "success",
//          ...pricing,
//       });
//    })
// );

router.post(
   "/autoChangeDriver",
   auth,
   catchAsync(async (req, res, next) => {
      let { driverId, requestId } = req.body;
      let changedDriver = await driverService.changeDriver(requestId, driverId);
      if (changedDriver.statusCode) {
         return next(changedDriver);
      }
      res.status(200).json({ status: "success", ...changedDriver });
   })
);

router.post(
   "/getDriver",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['get driver'] = {
            in: 'body',
            schema: {
                $carServiceTypeId: [1,2,3],
                $location: {
                    $lat: 31.123,
                    $lng: 31.123
                }
            }
        }
    */
      if (!req.body.carServiceTypeId) {
         return next(new AppError("Please provide a carServiceTypeId", 400));
      } else if (!req.body.location) {
         return next(new AppError("please provide location", 400));
      } else {
         let carServiceTypes = JSON.parse(req.body.carServiceTypeId);
         let freeVehicles = await vehicleService.getAllAvailableVehicles(
            carServiceTypes
         );
         let busyVehicles = await vehicleService.getAllNotAvailableVehicles(
            carServiceTypes
         );
         // vehicles = vehicles.get({plain:true})
         // if (freeVehicles.statusCode) {

         // } else {
         let drivers = freeVehicles.map(({ Driver }) => Driver);
         let busyDrivers = busyVehicles.map(({ Driver }) => Driver);
         // const nearestBusyDriver =
         // const drivers = await driverService.getAllAvailableDrivers()
         let location = JSON.parse(req.body.location);
         const nearestFreeDriver = await driverService.sendNearestDriver(
            location,
            drivers
         );
         const nearestBusyDriver = await driverService.sendNearestBusyDriver(
            location,
            busyDrivers
         );
         console.log(
            "------------------- nearestBusyDriver --------------------"
         );
         console.log(nearestBusyDriver);
         console.log(
            "------------------- nearestFreeDriver --------------------"
         );
         console.log(nearestFreeDriver);

         if (nearestFreeDriver.statusCode && nearestBusyDriver.statusCode) {
            return next(nearestFreeDriver);
         } else if (nearestBusyDriver.statusCode) {
            console.log("Sent the nearest Free");
            res.status(200).json({
               status: "success",
               ...nearestFreeDriver,
            });
         } else if (nearestFreeDriver.statusCode) {
            console.log("Sent the nearest Busy");
            res.status(200).json({
               status: "success",
               ...nearestBusyDriver,
            });
         } else {
            if (
               nearestFreeDriver.distance.duration.value <=
               nearestBusyDriver.distance.duration.value
            ) {
               console.log("Sent the nearest Free");
               res.status(200).json({
                  status: "success",
                  ...nearestFreeDriver,
               });
            } else if (
               nearestFreeDriver.distance.duration.value >
               nearestBusyDriver.distance.duration.value
            ) {
               res.status(200).json({
                  status: "success",
                  ...nearestBusyDriver,
               });
            }
         }
      }
      // }
   })
);

router.post(
   "/getDriverOtherServices",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['get driver'] = {
            in: 'body',
            schema: {
                $carServiceTypeId: [1,2,3],
                $location: {
                    $lat: 31.123,
                    $lng: 31.123
                }
            }
        }
    */
      if (!req.body.carServiceTypeId) {
         return next(new AppError("Please provide a carServiceTypeId", 400));
      } else if (!req.body.location) {
         return next(new AppError("please provide location", 400));
      } else {
         let carServiceTypes = req.body.carServiceTypeId;
         // console.log(req.body.carServiceTypeId);
         // console.log(carServiceTypes);
         let freeVehicles =
            await vehicleService.getAllAvailableVehiclesOtherServices(
               carServiceTypes
            );
         let busyVehicles =
            await vehicleService.getAllNotAvailableVehiclesOtherServices(
               carServiceTypes
            );
         // vehicles = vehicles.get({plain:true})
         // if (freeVehicles.statusCode) {

         // } else {
         let drivers = freeVehicles.map(({ Driver }) => Driver);
         let busyDrivers = busyVehicles.map(({ Driver }) => Driver);
         // const nearestBusyDriver =
         // const drivers = await driverService.getAllAvailableDrivers()
         let location = req.body.location;
         const nearestFreeDriver = await driverService.sendNearestDriver(
            location,
            drivers
         );
         const nearestBusyDriver =
            await driverService.sendNearestBusyDriverOtherServices(
               location,
               busyDrivers
            );
         console.log(
            "------------------- nearestBusyDriver --------------------"
         );
         console.log(nearestBusyDriver);
         console.log(
            "------------------- nearestFreeDriver --------------------"
         );
         console.log(nearestFreeDriver);

         if (nearestFreeDriver.statusCode && nearestBusyDriver.statusCode) {
            return next(nearestFreeDriver);
         } else if (nearestBusyDriver.statusCode) {
            console.log("Sent the nearest Free");
            res.status(200).json({
               status: "success",
               ...nearestFreeDriver,
            });
         } else if (nearestFreeDriver.statusCode) {
            console.log("Sent the nearest Busy");
            res.status(200).json({
               status: "success",
               ...nearestBusyDriver,
            });
         } else {
            if (
               nearestFreeDriver.distance.duration.value <=
               nearestBusyDriver.distance.duration.value
            ) {
               console.log("Sent the nearest Free");
               res.status(200).json({
                  status: "success",
                  ...nearestFreeDriver,
               });
            } else if (
               nearestFreeDriver.distance.duration.value >
               nearestBusyDriver.distance.duration.value
            ) {
               res.status(200).json({
                  status: "success",
                  ...nearestBusyDriver,
               });
            }
         }
      }
      // }
   })
);

router.post(
   "/getDriversService",
   auth,
   /* restrict,*/ catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['get driver'] = {
            in: 'body',
            schema: {
                $carServiceTypeId: [1,2,3],
            }
        }
    */
      let CarServiceTypes = req.body.carServiceTypes;
      const drivers = await driverService.getDriversByST(CarServiceTypes);
      res.status(200).json({
         status: "success",
         drivers,
      });
   })
);

router.get(
   "/getDriversMap",
   auth,
   /* restrict,*/ catchAsync(async (req, res, next) => {
      // let CarServiceTypes = req.body.carServiceTypes
      const drivers = await driverService.getAllOnlineDrivers();
      res.status(200).json({
         status: "success",
         drivers,
      });
   })
);

router.get(
   "/getOne/:driverId",
   catchAsync(async (req, res, next) => {
      const driverId = req.params.driverId;
      const driver = await driverService.getDriverById(driverId);
      res.status(200).json({
         status: "success",
         driver,
      });
   })
);

router.post(
   "/assignDriver",
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['assign driver'] = {
            in: 'body',
            schema: {
                $requestId: 1,
                $driverId: 1
            }
        }
    */
      const requestId = req.body.requestId;
      const driverId = req.body.driverId;
      const request = await driverService.assignDriver(requestId, driverId);
      if (request.statusCode) {
         return next(request);
      } else
         res.status(200).json({
            status: "success",
            ...request,
         });
   })
);

router.post(
   "/unassignDriver",
   catchAsync(async (req, res, next) => {
      let { requestId } = req.body;
      const request = await driverService.unassignDriver(requestId);
      if (request.statusCode) {
         return next(request);
      } else
         res.status(200).json({
            status: "success",
            request,
         });
      // await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...request,
      //    }
      // );
   })
);

router.post(
   "/assignVehicle",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['assign vehicle'] = {
            in: 'body',
            schema: {
                $driverId: 1,
                $IMEI: "IMEI",
                $fcmtoken: "token"
            }
        }
    */
      const vehicle = await driverService.assignDriverAndVehicle(
         req.body.driverId,
         req.body.IMEI,
         req.body.fcmtoken
      );
      if (vehicle.statusCode) return next(vehicle);
      else
         res.status(200).json({
            status: "success",
            vehicle,
         });
   })
);

router.post(
   "/logout",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['logout'] = {
            in: 'body',
            schema: {
                $driverId: 1
            }
        }
    */
      const response = await driverService.logOut(req.body.driverId);
      // const driver = await driverService.getDriverById(req.body.driverId);
      res.status(200).json({
         status: "success",
      });
      // await axios.post(
      //    "https://hook.eu1.make.com/yjpn07e9l3q5eqglbovpf6ghhls56i50",
      //    {
      //       ...driver,
      //    }
      // );
   })
);

router.get(
   "/driverStats",
   auth,
   catchAsync(async (req, res, next) => {
      let stats = await driverService.getDriverStats();
      res.status(200).json({
         status: "success",
         stats,
      });
   })
);

router.patch(
   "/updateStatus",
   auth,
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update status'] = {
            in: 'body',
            schema: {
                $driverId: 1,
                $available: true
            }
        }
    */
      let driverId = req.body.driverId;
      let available = req.body.available;
      const msg = await driverService.changeDriverStatus(driverId, available);
      if (msg.statusCode) {
         return next(msg);
      } else
         res.status(200).json({
            status: "success",
            msg,
         });
   })
);

router.get(
   "/getAll",
   auth,
   catchAsync(async (req, res, next) => {
      const drivers = await driverService.getAllDrivers();
      res.status(200).json({
         status: "success",
         drivers,
      });
   })
);

router.patch(
   "/updateDriverPhoto/:id",
   auth,
   restricted(Roles.Admin, Roles.Super),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update driver photo'] = {
            in: 'body',
            schema: {
                $image: "image"
            }
        }
    */
      const { image } = req.body;
      const driver = await driverService.uploadDriverImg(req.params.id, image);
      if (driver.statusCode) return next(driver);
      else
         res.status(200).json({
            status: "success",
            user: driver,
         });
   })
);

router.patch(
   "/updateLocation/:id",
   auth,
   restricted(Roles.Driver),
   catchAsync(async (req, res, next) => {
      /*
        #swagger.parameters['update driver location'] = {
            in: 'body',
            schema: {
                $location: {
                    lng: 1,
                    lat: 1
                }
            }
        }
    */
      const { location } = req.body;
      let loc = location;
      if (typeof location === "string") {
         loc = JSON.parse(location);
      }
      const driver = await driverService.updateDriverLocation(
         req.params.id,
         loc
      );
      if (driver.statusCode) return next(driver);
      else
         res.status(200).json({
            status: "success",
            driver,
         });
   })
);

router.post(
   "/getDurationAndDistance",
   catchAsync(async (req, res, next) => {
      let {
         driverLocation,
         curClientLocation,
         prevClientLocation,
         oldDest,
         from,
         reqId,
         status,
         traffic,
      } = req.body;
      // console.log(driverLocation);
      // console.log(curClientLocation);
      // console.log(prevClientLocation);
      let wayPoints = [];
      if (prevClientLocation) {
         wayPoints.push(`${prevClientLocation.lat},${prevClientLocation.lng}`);
      }
      if (oldDest) {
         wayPoints.push(`${oldDest.lat},${oldDest.lng}`);
      }
      reqId = reqId && reqId === 0 ? undefined : reqId;
      let driver = `${driverLocation.lat},${driverLocation.lng}`;
      let client = `${curClientLocation.lat},${curClientLocation.lng}`;
      const distanceAndDuration = await driverService.getDurationAndDistance(
         driver,
         client,
         wayPoints,
         from,
         reqId,
         status,
         traffic
      );
      res.status(200).json({
         status: "success",
         distanceAndDuration,
      });
   })
);

router.post(
   "/getDurationAndDistanceOtherServices",
   catchAsync(async (req, res, next) => {
      let { driverLocation, curClientLocation, from, reqId, traffic } =
         req.body;
      // console.log(driverLocation);
      // console.log(curClientLocation);
      let wayPoints = [];
      reqId = reqId && reqId === 0 ? undefined : reqId;
      let driver = `${driverLocation.lat},${driverLocation.lng}`;
      let client = `${curClientLocation.lat},${curClientLocation.lng}`;
      const distanceAndDuration =
         await driverService.getDurationAndDistanceOtherServices(
            driver,
            client,
            wayPoints,
            from,
            reqId,
            status,
            traffic
         );
      res.status(200).json({
         status: "success",
         distanceAndDuration,
      });
   })
);

module.exports = router;
