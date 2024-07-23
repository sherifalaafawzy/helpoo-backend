// NPM Lib
const { Op } = require("sequelize");
const moment = require("moment");
const polyUtil = require("polyline-encoded");

// Models
const Driver = require("../models/Driver");
const User = require("../models/User");
const CarServiceType = require("../models/CarServiceType");
const Vehicle = require("../models/Vehicle");
const VehicleType = require("../models/VehicleType");
const ServiceRequest = require("../models/ServiceRequest");
const Client = require("../models/Client");

// Services
const vehicleService = require("./vehicleService");
const originalFees = require("./service_requests/originalFees");
// Other Module with Functions
const DriverFunctions = require("./DriverFunctions");

// Utils
const AppError = require("../utils/AppError");
const Config = require("../models/Config");
class DriverService {
   // async getAllDrivers() {
   //     const drivers = await Driver.findAll({})
   //     return drivers
   // }
   async changeDriver(requestId, preventedId) {
      let request = await ServiceRequest.findByPk(requestId, {
         include: [Driver, { model: CarServiceType }],
      });
      request = request.get({ plain: true });
      let types = request.CarServiceTypes;
      let carServiceTypeIds = types.map((el) => {
         return el.id;
      });
      let vehicles = await vehicleService.getAllAvailableVehicles(
         carServiceTypeIds
      );
      let busyVehicles = await vehicleService.getAllNotAvailableVehicles(
         carServiceTypeIds
      );

      let drivers = vehicles.map(({ Driver }) => Driver);
      let busyDrivers = busyVehicles.map(({ Driver }) => Driver);
      const newFreeDriver = await this.sendNearestDriver(
         request.location,
         drivers,
         preventedId
      );
      const nearestBusyDriver = await this.sendNearestBusyDriver(
         request.location,
         busyDrivers,
         preventedId
      );
      let newDriver;
      // if (newDriver.statusCode) {
      //    return newDriver;
      // }
      // if (!newDriver) {
      //    return new AppError("no drivers available", 400);
      // }
      if (newFreeDriver.statusCode && nearestBusyDriver.statusCode) {
         return newFreeDriver;
      } else if (nearestBusyDriver.statusCode) {
         newDriver = newFreeDriver;
      } else if (newFreeDriver.statusCode) {
         newDriver = nearestBusyDriver;
      } else {
         if (
            newFreeDriver.distance.duration.value <=
            nearestBusyDriver.distance.duration.value
         ) {
            newDriver = newFreeDriver;
         } else if (
            newFreeDriver.distance.duration.value >
            nearestBusyDriver.distance.duration.value
         ) {
            newDriver = nearestBusyDriver;
         }
      }
      if (request.DriverId) {
         let checkIfHeHadAnother = await ServiceRequest.findOne({
            where: {
               DriverId: request.DriverId,
               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
            },
         });
         if (!checkIfHeHadAnother) {
            await Driver.update(
               {
                  available: true,
               },
               {
                  where: {
                     id: request.DriverId,
                  },
               }
            );

            await Vehicle.update(
               {
                  available: true,
               },
               {
                  where: {
                     Active_Driver: request.DriverId,
                  },
               }
            );
         }
      }
      let vehicle = await vehicleService.getVehicleByDriverId(
         newDriver.driver.id
      );
      // send vehicle with driver as response
      let anotherRequest = await ServiceRequest.findOne({
         where: {
            DriverId: newDriver.driver.id,
            status: {
               [Op.notIn]: [
                  "done",
                  "canceled",
                  "cancelWithPayment",
                  "confirmed",
               ],
            },
         },
      });

      let status = anotherRequest ? "confirmed" : "confirmed";
      let requestUpdate = await ServiceRequest.update(
         {
            DriverId: newDriver.driver.id,
            status:
               request.paymentMethod === "online-card" &&
               request.paymentStatus === "not-paid"
                  ? "open"
                  : status,
            VehicleId: vehicle.id,
            reject: false,
         },
         {
            where: {
               id: requestId,
            },
         }
      );

      let driverUpdate = await Driver.update(
         {
            available: false,
         },
         {
            where: {
               id: newDriver.driver.id,
            },
         }
      );

      let vehicleUpdate = await vehicleService.updateVehicle({
         data: { available: false },
         vehicleId: vehicle.id,
      });
      request = await ServiceRequest.findByPk(requestId, { include: Driver });
      let driverUser = await User.findByPk(newDriver.driver.UserId);
      vehicle = await vehicleService.getVehicleByDriverId(newDriver.driver.id);
      return {
         driver: {
            id: newDriver.driver.id,
            userId: driverUser.id,
            phoneNumber: newDriver.driver.PhoneNumber,
            name: driverUser.name,
            photo: newDriver.driver.photo,
            averageRating: newDriver.driver.average_rating,
            ratingCount: newDriver.driver.rating_count,
            fcmtoken: newDriver.driver.fcmtoken,
         },
         distance: newDriver.distance,
         driverDistanceMatrixFromDestination:
            newDriver.driverDistanceMatrixFromDestination,
         driverDistanceMatrixForDestination:
            newDriver.driverDistanceMatrixForDestination,
         location: newDriver.location,
         vehiclePhoneNumber: vehicle.PhoneNumber,
         msg: "assigned",
         carServiceTypeIds,
      };
   }
   async getAllAvailableDrivers() {
      let drivers = await Driver.findAll({
         where: {
            available: true,
            offline: false,
         },
         include: [
            {
               model: Vehicle,
               include: [VehicleType],
            },
            {
               model: User,
            },
         ],
      });
      drivers = drivers.map((driver) => driver.get({ plain: true }));
      return drivers;
   }
   async getDriverById(id) {
      let driver = await Driver.findOne({
         where: {
            id,
         },
      });
      let user = await User.findOne({
         where: {
            id: driver.UserId,
         },
      });
      let vehicle = await Vehicle.findOne({
         where: {
            Active_Driver: driver.id,
         },
      });
      if (!driver) {
         return new AppError("Couldn't find this Driver", 404);
      }
      if (!user) {
         return new AppError("Couldn't find this User", 404);
      }
      driver = driver.get({ plain: true });
      user = user.get({ plain: true });
      return {
         id: driver.id,
         offline: driver.offline,
         averageRating: driver.average_rating,
         ratingCount: driver.rating_count,
         lat: driver.location.latitude,
         lng: driver.location.longitude,
         heading: driver.location.heading,
         available: driver.available,
         UserId: driver.UserId,
         photo: user.photo,
         name: user.name,
         phoneNumber: user.PhoneNumber,
         fcmtoken: driver.fcmtoken,
      };
   }
   async sendNearestDriver(location, drivers, preventedId) {
      const filteredDrivers = await DriverFunctions.filterDrivers(
         drivers,
         location,
         preventedId
      );
      if (filteredDrivers.length === 0)
         return new AppError("No drivers available", 400);
      const nearestDriver = await DriverFunctions.getTheNearest(
         location,
         filteredDrivers
      );

      if (nearestDriver === null || !nearestDriver)
         return new AppError("couldn't find a driver now", 400);
      // if (nearestDriver.statusCode) return nearestDriver;
      const driver = await this.sendDriverData(
         nearestDriver.driver.id,
         nearestDriver
      );

      return driver;
   }

   async sendNearestBusyDriver(location, drivers, preventedId) {
      const filteredDrivers = await DriverFunctions.filterBusyDrivers(
         drivers,
         location,
         preventedId
      );

      if (filteredDrivers.length === 0)
         return new AppError("No drivers available", 400);
      const nearestDriver = await DriverFunctions.getTheNearestBusy(
         location,
         filteredDrivers
      );
      if (nearestDriver === null || !nearestDriver || !nearestDriver.driver)
         return new AppError("couldn't find a driver now", 400);
      const driver = await this.sendDriverData(
         nearestDriver.driver.id,
         nearestDriver
      );
      return driver;
   }

   async sendNearestBusyDriverOtherServices(location, drivers, preventedId) {
      const filteredDrivers =
         await DriverFunctions.filterBusyDriversOtherServices(
            drivers,
            location,
            preventedId
         );

      if (filteredDrivers.length === 0)
         return new AppError("No drivers available", 400);
      const nearestDriver =
         await DriverFunctions.getTheNearestBusyOtherServices(
            location,
            filteredDrivers
         );
      if (nearestDriver === null || !nearestDriver || !nearestDriver.driver)
         return new AppError("couldn't find a driver now", 400);
      const driver = await this.sendDriverData(
         nearestDriver.driver.id,
         nearestDriver
      );
      return driver;
   }

   async sendDriverData(driverId, nearestDriver) {
      let driver = await Driver.findOne({
         where: {
            id: driverId,
         },
      });
      const user = await User.findOne({
         where: {
            id: driver.UserId,
         },
      });
      const vehicle = await Vehicle.findOne({
         where: {
            Active_Driver: driverId,
         },
      });
      driver = driver.get({ plain: true });
      const data = {
         driver: {
            id: driver.id,
            offline: driver.offline,
            averageRating: driver.average_rating,
            ratingCount: driver.rating_count,
            lat: driver.location.latitude,
            lng: driver.location.longitude,
            heading: driver.location.heading,
            available: driver.available,
            UserId: driver.UserId,
            photo: user.photo,
            name: user.name,
            phoneNumber: vehicle.PhoneNumber,
            fcmtoken: driver.fcmtoken,
         },
         distance: {
            ...nearestDriver.driverDistanceMatrix,
         },
         distanceForTheFirstClient: nearestDriver.driverAndDistanceForClient,
         distanceFromDestination:
            nearestDriver.driverDistanceMatrixFromDestination,
         distanceForDestination:
            nearestDriver.driverDistanceMatrixForDestination,
         location: nearestDriver.location,
         firstClientLocation: nearestDriver.firstClientLocation,
         requestId: nearestDriver.requestId,
      };
      return data;
   }

   // async checkNewPricing(carServiceTypeId, requestId, driverId) {
   //    let request = await ServiceRequest.findByPk(requestId);
   //    if (!request) return new AppError("No request with this id", 404);
   //    let driver = await Driver.findByPk(driverId);
   //    if (!driver) return new AppError("No driver with this id", 404);
   //    let distance = await DriverFunctions.distanceMatrix(
   //       request.location,
   //       driver
   //    );
   //    let newDestination = await originalFees.getCalculateDistance(
   //       distance,
   //       request.location.destinationDistance
   //    );
   //    if (
   //       request.location.destinationDistance.distance.value <
   //       newDestination.distance.value
   //    ) {
   //       let newOriginalFees = await originalFees.getOriginalFees(
   //          carServiceTypeId,
   //          changeDriver.distance,
   //          newDestination
   //       );
   //       let discount = request.discountPercentage
   //          ? request.discountPercentage
   //          : 0;
   //       let newFees = newOriginalFees - (discount * newOriginalFees) / 100;
   //       return { newOriginalFees, newFees };
   //    } else {
   //       return {
   //          newOriginalFees: request.originalFees,
   //          newFees: request.fees,
   //       };
   //    }
   // }

   async assignDriver(requestId, driverId) {
      if (!requestId || !driverId)
         return new AppError(
            "Missing Data , Please Check sending requestId and driverId",
            400
         );
      // Check if the request exist
      // get the driver
      let driver = await Driver.findByPk(driverId, { include: User });
      if (!driver) {
         return new AppError("Can not find this driver", 400);
      }
      // get driver plain to control the data
      driver = driver.get({ plain: true });
      // get request and vehicle
      let request = await ServiceRequest.findByPk(requestId, {
         include: [Driver, { model: CarServiceType }],
      });
      if (!request) return new AppError("No Request with this id", 400);
      let oldRequestId;
      let vehicle = await vehicleService.getVehicleByDriverId(driverId);
      // replace the condition to check number of assigned requests for the driver
      // then re-do what we have fuckin done in getDriver
      let requests = await ServiceRequest.findAll({
         where: {
            DriverId: driver.id,

            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
         },
      });

      let obj = {
         started: 1,
         destArrived: 1,
         accepted: 1,
         arrived: 1,
      };
      // let lastCondition = requests.length > 0 ? !obj[requests[0].status]
      let firstCondition =
         !driver.available &&
         (requests.length > 1 || !obj[requests[0]?.status]);
      if (firstCondition || vehicle.statusCode || driver.offline) {
         const changeDriver = await this.changeDriver(requestId);
         if (changeDriver.statusCode) {
            let update = await ServiceRequest.update(
               {
                  status: "not_available",
                  DriverId: null,
                  VehicleId: null,
               },
               {
                  where: {
                     id: requestId,
                  },
               }
            );
            return changeDriver;
         }
         // let distance = changeDriver.driverDistanceMatrixFromDestination
         //    ? changeDriver.driverDistanceMatrixFromDestination
         //    : changeDriver.distance;
         // let newDestination = await originalFees.getCalculateDistance(
         //    distance,
         //    request.location.destinationDistance
         // );
         // if (
         //    request.location.destinationDistance.distance.value >=
         //    newDestination.distance.value
         // ) {
         return changeDriver;
         // } else {
         //    let newOriginalFees = await originalFees.getOriginalFees(
         //       changeDriver.carServiceTypeIds,
         //       distance,
         //       newDestination
         //    );
         //    let discount = request.discountPercentage
         //       ? request.discountPercentage
         //       : 0;
         //    let newFees = newOriginalFees - (discount * newOriginalFees) / 100;
         //    request.location.calculatedDistance = newDestination;

         //    if (newFees > Number(request.fees) * 1.25) {
         //       let location = request.location;
         //       await ServiceRequest.update(
         //          {
         //             fees: newFees,
         //             originalFees: newOriginalFees,
         //             location,
         //          },
         //          {
         //             where: {
         //                id: requestId,
         //             },
         //          }
         //       );
         //       return {
         //          ...changeDriver,
         //          newFees,
         //          differenceFees: newFees - request.fees,
         //       };
         //    } else {
         //       return changeDriver;
         //    }
         // }
      }
      if (request.DriverId) {
         let checkIfHeHadAnother = await ServiceRequest.findOne({
            where: {
               DriverId: request.DriverId,
               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
            },
         });
         if (!checkIfHeHadAnother) {
            await Driver.update(
               {
                  available: true,
               },
               {
                  where: {
                     id: request.DriverId,
                  },
               }
            );

            await Vehicle.update(
               {
                  available: true,
               },
               {
                  where: {
                     Active_Driver: request.DriverId,
                  },
               }
            );
         }
      }
      request = request.get({ plain: true });
      let types = request.CarServiceTypes;
      let carServiceTypeIds = types.map((el) => {
         return el.id;
      });

      // let driverDistance;
      // TODO: return distance value through get distance and duration
      // if (driver.available) {
      //    driverDistance = await this.getDurationAndDistance(driver.location, location)
      // } else {
      //    let currentRequest = requests[0];
      //    driverDistance = await DriverFunctions.distanceMatrix(
      //       request.location,
      //       {
      //          location: {
      //             latitude: currentRequest.location.destinationLat,
      //             longitude: currentRequest.location.destinationLng,
      //          },
      //       }
      //    );
      // }
      let anotherRequest = await ServiceRequest.findOne({
         where: {
            DriverId: driver.id,
            status: {
               [Op.notIn]: [
                  "done",
                  "canceled",
                  "cancelWithPayment",
                  "confirmed",
               ],
            },
         },
      });
      anotherRequest ? (oldRequestId = anotherRequest.id) : "";
      let status = anotherRequest ? "confirmed" : "confirmed";
      // let newDestination = await originalFees.getCalculateDistance(
      //    driverDistance,
      //    request.location.destinationDistance
      // );
      // if (
      //    request.location.destinationDistance.distance.value >=
      //    newDestination.distance.value
      // ) {

      let requestUpdate = await ServiceRequest.update(
         {
            DriverId: driverId,
            status:
               request.paymentMethod === "online-card" &&
               request.paymentStatus === "not-paid"
                  ? "open"
                  : status,
            VehicleId: vehicle.id,
            reject: false,
         },
         {
            where: { id: requestId },
         }
      );
      let vehicleUpdate = await vehicleService.updateVehicle({
         data: { available: false },
         vehicleId: vehicle.id,
      });

      let driverUpdate = await Driver.update(
         {
            available: false,
         },
         {
            where: {
               id: driverId,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestId, {
         include: Driver,
      });

      let driverUser = await User.findByPk(driver.UserId);
      vehicle = await vehicleService.getVehicleByDriverId(driver.id);

      return {
         vehiclePhoneNumber: vehicle.PhoneNumber,
         msg: "assigned",
         requestId: oldRequestId,
      };
      // } else {
      //    let newOriginalFees = await originalFees.getOriginalFees(
      //       carServiceTypeIds,
      //       driverDistance,
      //       newDestination
      //    );
      //    let discount = request.discountPercentage
      //       ? request.discountPercentage
      //       : 0;
      //    let newFees = newOriginalFees - (discount * newOriginalFees) / 100;
      //    request.location.calculatedDistance = newDestination;
      //    let location = request.location;
      //    if (newFees > Number(request.fees) * 1.25) {
      //       let oldFees = Number(request.fees);
      //       await ServiceRequest.update(
      //          {
      //             fees: newFees,
      //             originalFees: newOriginalFees,
      //             location,
      //          },
      //          {
      //             where: {
      //                id: requestId,
      //             },
      //          }
      //       );

      //       request = await ServiceRequest.update(
      //          {
      //             DriverId: driverId,
      //             status,
      //             VehicleId: vehicle.id,
      //             reject: false,
      //          },
      //          {
      //             where: { id: requestId },
      //          }
      //       );
      //       let vehicleUpdate = await vehicleService.updateVehicle({
      //          data: { available: false },
      //          vehicleId: vehicle.id,
      //       });

      //       let driverUpdate = await Driver.update(
      //          {
      //             available: false,
      //          },
      //          {
      //             where: {
      //                id: driverId,
      //             },
      //          }
      //       );
      //       request = await ServiceRequest.findByPk(requestId, {
      //          include: Driver,
      //       });

      //       let driverUser = await User.findByPk(driver.UserId);
      //       vehicle = await vehicleService.getVehicleByDriverId(driver.id);

      //       return {
      //          vehiclePhoneNumber: vehicle.PhoneNumber,
      //          msg: "assigned",
      //          newFees,
      //          differenceFees: newFees - oldFees,
      //          requestId: oldRequestId,
      //       };
      //    } else {
      //       request = await ServiceRequest.update(
      //          {
      //             DriverId: driverId,
      //             status,
      //             VehicleId: vehicle.id,
      //             reject: false,
      //          },
      //          {
      //             where: { id: requestId },
      //          }
      //       );
      //       let vehicleUpdate = await vehicleService.updateVehicle({
      //          data: { available: false },
      //          vehicleId: vehicle.id,
      //       });

      //       let driverUpdate = await Driver.update(
      //          {
      //             available: false,
      //          },
      //          {
      //             where: {
      //                id: driverId,
      //             },
      //          }
      //       );
      //       request = await ServiceRequest.findByPk(requestId, {
      //          include: Driver,
      //       });

      //       let driverUser = await User.findByPk(driver.UserId);
      //       vehicle = await vehicleService.getVehicleByDriverId(driver.id);

      //       return {
      //          vehiclePhoneNumber: vehicle.PhoneNumber,
      //          msg: "assigned",
      //          requestId: oldRequestId,
      //       };
      //    }
      // }
   }
   async unassignDriver(requestId) {
      if (!requestId) {
         return new AppError(
            "Missing Data , Please Check sending requestId",
            400
         );
      }
      let request = await ServiceRequest.findByPk(requestId);
      let driverId = request.DriverId;
      let driver = await Driver.findByPk(driverId);
      if (!request) return new AppError("No Request with this id", 400);
      if (!driver) return new AppError("No Driver with this id", 400);
      await ServiceRequest.update(
         {
            DriverId: null,
            VehicleId: null,
         },
         {
            where: {
               id: requestId,
            },
         }
      );
      await Driver.update(
         {
            available: true,
         },
         {
            where: {
               id: driverId,
            },
         }
      );
      await Vehicle.update(
         {
            available: true,
         },
         {
            where: {
               Active_Driver: driverId,
            },
         }
      );
      request = await ServiceRequest.findByPk(requestId);
      return request;
   }
   async finishRequest(requestId, driverId) {
      // * We will change the status of the request then change driver and vehicle availability
      const request = await ServiceRequest.findByPk(requestId);
      if (!request) return new AppError("There's no request with this Id", 400);

      const driver = await Driver.findByPk(driverId);
      const vehicle = await Vehicle.findOne({
         where: {
            Active_Driver: driverId,
         },
      });
      if (!driver || !vehicle)
         return new AppError(
            "There's no driver with this Id or No vehicle with this driver",
            400
         );
      let location = request.location;
      // console.log(location);
      delete location?.calculatedDistance?.points;
      location?.firstUpdatedDistanceAndDuration
         ? delete location?.firstUpdatedDistanceAndDuration
         : undefined;
      location?.lastUpdatedDistanceAndDuration
         ? delete location?.lastUpdatedDistanceAndDuration
         : undefined;
      delete location?.acceptedWithTraffic?.points;
      delete location?.startedWithTraffic?.points;
      // console.log(location);

      const updateRequest = await ServiceRequest.update(
         {
            status: "done",
            endTime: moment(Date.now()).format(),
            location,
         },
         {
            where: {
               id: requestId,
            },
         }
      );
      let checkIfHeHadAnother = await ServiceRequest.findOne({
         where: {
            DriverId: request.DriverId,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
            id: {
               [Op.ne]: request.id,
            },
         },
      });
      if (checkIfHeHadAnother) {
         return "Done";
      } else {
         const updateDriver = await Driver.update(
            {
               available: true,
            },
            {
               where: {
                  id: driverId,
               },
            }
         );
         const updateVehicle = await Vehicle.update(
            {
               available: true,
            },
            {
               where: {
                  Active_Driver: driverId,
               },
            }
         );

         return "Done";
      }
   }
   async logOut(driverId) {
      const driver = await Driver.findByPk(driverId);
      const vehicle = await Vehicle.findOne({
         where: {
            Active_Driver: driverId,
         },
      });
      if (!vehicle) return "Done";
      let request = await ServiceRequest.findOne({
         where: {
            DriverId: driverId,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
         },
      });
      if (request)
         return new AppError("finish your requests first before logout", 400);
      const logOutDriver = await Driver.update(
         {
            offline: true,
            available: false,
         },
         {
            where: {
               id: driverId,
            },
         }
      );
      const deleteNumber = await User.update(
         { PhoneNumber: null },
         { where: { id: driver.UserId } }
      );
      const removeFromVehicle = await Vehicle.update(
         {
            Active_Driver: null,
            available: false,
         },
         {
            where: {
               id: vehicle.id,
            },
         }
      );
      return "Done";
   }
   async assignDriverAndVehicle(driverId, IMEI, fcmtoken) {
      try {
         const driverPrepare = await Driver.findOne({
            where: {
               id: driverId,
            },
         });
         if (!driverPrepare) return new AppError("no driver with this Id", 404);
         const checkVehicle = await Vehicle.findOne({
            where: {
               IMEI,
            },
         });
         if (!checkVehicle)
            return new AppError("No vehicle is assigned with this phone", 400);
         if (
            checkVehicle.Active_driver &&
            checkVehicle.Active_driver === driverId
         )
            return checkVehicle;
         const changeOffline = await Driver.update(
            {
               offline: false,
               fcmtoken: fcmtoken,
            },
            {
               where: {
                  id: driverPrepare.id,
               },
            }
         );
         const assignOnVehicle = await Vehicle.update(
            {
               Active_Driver: driverPrepare.id,
               available: true,
            },
            {
               where: {
                  IMEI: IMEI,
               },
            }
         );
         const vehicle = await Vehicle.findOne({
            where: {
               IMEI: IMEI,
            },
         });
         const updateNumber = await User.update(
            {
               PhoneNumber: vehicle.PhoneNumber,
            },
            {
               where: {
                  id: driverPrepare.UserId,
               },
            }
         );
         return vehicle;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }
   async changeDriverStatus(driverId, available) {
      if (!driverId || available === undefined)
         return new AppError("Invalid Data", 400);
      let updateDriver = await Driver.update(
         {
            available,
         },
         {
            where: {
               id: driverId,
            },
         }
      );
      let updateVehicle = await Vehicle.update(
         {
            available,
         },
         {
            where: {
               Active_Driver: driverId,
            },
         }
      );
      return "ok";
   }
   async getAllDrivers() {
      const drivers = await Driver.findAll({
         include: [
            {
               model: Vehicle,
               include: [VehicleType, CarServiceType],
            },
            {
               model: User,
            },
            {
               model: ServiceRequest,
               where: {
                  status: {
                     [Op.or]: ["started", "accepted"],
                  },
               },
               required: false,
               include: [
                  {
                     model: Client,
                     include: [User],
                  },
               ],
            },
         ],
      });
      return drivers;
   }
   async getDriverByUserId(id) {
      const driver = await Driver.findOne({
         where: {
            UserId: id,
         },
      });
      if (!driver) return new AppError("something went wrong!", 400);
      return driver;
   }
   async uploadDriverImg(driverUserId, image) {
      // const driver = await Driver.findOne({
      //     where:{
      //         id:driverId
      //     }
      // })
      // if(!driver) return new AppError("no driver with this Id", 404)
      const driverUser = await User.findOne({
         where: {
            id: driverUserId,
         },
      });
      if (!driverUser)
         return new AppError("There is no user with this id", 404);
      const img = decodeImages(`pp-driver-${driverUserId}`, image);
      const updatedDriver = await driverUser.update({ photo: img });
      return updatedDriver;
   }
   async updateDriverLocation(driverId, location) {
      const checkExist = await Driver.findOne({
         where: {
            id: driverId,
         },
      });
      if (!checkExist) return new AppError("no driver with this Id", 404);
      const updatedDriver = await checkExist.update({ location });
      return updatedDriver;
   }
   async getDriversByST(carServiceTypes) {
      let vehicles = await vehicleService.getAllAvailableVehicles(
         carServiceTypes
      );
      let busyVehicles = await vehicleService.getAllNotAvailableVehicles(
         carServiceTypes
      );
      let allDrivers = [];
      let drivers = [];
      let busyDrivers = [];
      if (vehicles.statusCode) {
      } else {
         drivers = vehicles.map((vehicle) => {
            return {
               driver: vehicle.Driver,
               CarServiceTypes: vehicle.CarServiceTypes,
               vehicle: {
                  Vec_plate: vehicle.Vec_plate,
                  Vec_name: vehicle.Vec_name,
                  Vec_num: vehicle.Vec_num,
                  Vec_type_name: vehicle.VehicleType.TypeName,
                  Vec_type: vehicle.Vec_type,
                  url: vehicle.url,
               },
            };
         });
      }
      if (busyVehicles.statusCode) {
      } else {
         let preBusyDrivers = busyVehicles.map((vehicle) => {
            return {
               driver: vehicle.Driver,
               CarServiceTypes: vehicle.CarServiceTypes,
               vehicle: {
                  Vec_plate: vehicle.Vec_plate,
                  Vec_name: vehicle.Vec_name,
                  Vec_num: vehicle.Vec_num,
                  Vec_type_name: vehicle.VehicleType.TypeName,
                  Vec_type: vehicle.Vec_type,
                  url: vehicle.url,
               },
            };
         });
         // busyDrivers = await DriverFunctions.filterBusyDrivers(preBusyDrivers);
         for (let i = 0; i < preBusyDrivers.length; i++) {
            const isValid = await DriverFunctions.validBusyDrivers(
               preBusyDrivers[i].driver
            );
            if (isValid) {
               busyDrivers.push(preBusyDrivers[i]);
               continue;
            } else {
               continue;
            }
         }
      }

      allDrivers = [...drivers, ...busyDrivers];

      return allDrivers;
   }
   async getAllOnlineDrivers() {
      let vehicles = await vehicleService.getAllOnlineVehicles();
      if (vehicles.statusCode) return [];
      let drivers = vehicles.map((vehicle) => {
         return {
            driver: vehicle.Driver,
            CarServiceTypes: vehicle.CarServiceTypes,
            vehicle: {
               Vec_plate: vehicle.Vec_plate,
               Vec_name: vehicle.Vec_name,
               Vec_num: vehicle.Vec_num,
               Vec_type_name: vehicle.VehicleType.TypeName,
               Vec_type: vehicle.Vec_type,
               url: vehicle.url,
            },
         };
      });
      return drivers;
   }

   async deleteDriver(driverId) {
      try {
         let driver = await Driver.destroy({
            where: {
               id: driverId,
            },
            cascade: true,
         });
         return "Done";
      } catch (error) {
         console.error(error);
         return new AppError("something went wrong", 500);
      }
   }

   async getDriverStats() {
      let allDrivers = await Driver.findAndCountAll({
         include: [User],
      });
      let offlineDrivers = await Driver.findAndCountAll({
         where: {
            offline: true,
         },
         include: [User],
      });
      let busyDrivers = await Driver.findAndCountAll({
         where: {
            available: false,
            offline: false,
         },
         include: [User],
      });
      let freeDrivers = await Driver.findAndCountAll({
         where: {
            available: true,
            offline: false,
         },
         include: [User],
      });
      let onlineDrivers = await Driver.findAndCountAll({
         where: {
            offline: false,
         },
         include: [User],
      });
      let onlineAndWorkingDrivers = await Driver.findAndCountAll({
         where: {
            offline: false,
            // open: true,
         },
         include: [User],
      });
      let onlineAndNotWorkingDrivers = await Driver.findAndCountAll({
         where: {
            offline: false,
            // open: false,
         },
         include: [User],
      });
      return {
         allDrivers,
         offlineDrivers,
         busyDrivers,
         freeDrivers,
         onlineDrivers,
         onlineAndWorkingDrivers,
         onlineAndNotWorkingDrivers,
      };
   }
   async returnTimeAndDistance(reqId, legs, status, points) {
      let move;
      let config = await Config.findOne();
      let obj = {
         started: 1,
         destArrived: 1,
      };
      let obj2 = {
         accepted: 1,
         arrived: 1,
      };
      if (obj[status]) {
         let driverDistanceMatrixForDestination = {
            distance: legs[0].distance,
            duration: legs[0].duration,
         };
         let driverDistanceMatrixFromDestination = {
            distance: legs[1].distance,
            duration: legs[1].duration,
         };
         let distanceValue =
            driverDistanceMatrixFromDestination.distance.value +
            driverDistanceMatrixForDestination.distance.value;
         let durationValue =
            driverDistanceMatrixForDestination.duration.value +
            driverDistanceMatrixFromDestination.duration.value +
            config.finishTime * 60;
         let driverDistanceMatrix = {
            distance: {
               value: distanceValue,
               text: `${Math.ceil(distanceValue / 100) / 10} km`,
            },
            duration: {
               value: durationValue,
               text: returnTheRightText(durationValue),
            },
         };
         if (reqId) {
            move = await this.updateLastAndFirstHits(
               reqId,
               driverDistanceMatrix,
               points
            );
         }
         return { driverDistanceMatrix, move };
      }
      if (obj2[status]) {
         let driverAndDistanceForClient = {
            distance: legs[0].distance,
            duration: legs[0].duration,
         };
         let driverDistanceMatrixForDestination = {
            distance: legs[1].distance,
            duration: legs[1].duration,
         };
         let driverDistanceMatrixFromDestination = {
            distance: legs[2].distance,
            duration: legs[2].duration,
         };
         let distanceValue =
            driverAndDistanceForClient.distance.value +
            driverDistanceMatrixFromDestination.distance.value +
            driverDistanceMatrixForDestination.distance.value;
         let durationValue =
            driverAndDistanceForClient.duration.value +
            driverDistanceMatrixForDestination.duration.value +
            driverDistanceMatrixFromDestination.duration.value +
            config.finishTime * 60 +
            config.carryingTime * 60;
         let driverDistanceMatrix = {
            distance: {
               value: distanceValue,
               text: `${Math.ceil(distanceValue / 100) / 10} km`,
            },
            duration: {
               value: durationValue,
               text: returnTheRightText(durationValue),
            },
         };
         if (reqId) {
            move = await this.updateLastAndFirstHits(
               reqId,
               driverDistanceMatrix,
               points
            );
         }
         return { driverDistanceMatrix, move };
      }
      let driverDistanceMatrix = {
         distance: legs[0].distance,
         duration: legs[0].duration,
      };
      if (reqId) {
         move = await this.updateLastAndFirstHits(
            reqId,
            driverDistanceMatrix,
            points
         );
      }
      return { driverDistanceMatrix, move };
   }

   async updateLastAndFirstHits(reqId, distanceMatrix, points) {
      let move = false;
      let moveAfter = 0;
      let sr = await ServiceRequest.findByPk(reqId);
      let location = { ...sr.location };
      location["lastUpdatedDistanceAndDuration"] = {
         driverDistanceMatrix: distanceMatrix,
         createdAt: moment().toISOString(),
         status: sr.status,
         DriverId: sr.DriverId,
         points,
      };
      if (
         !location.firstUpdatedDistanceAndDuration ||
         location.firstUpdatedDistanceAndDuration.DriverId !== sr.DriverId
      ) {
         location["firstUpdatedDistanceAndDuration"] = {
            driverDistanceMatrix: distanceMatrix,
            createdAt: moment().toISOString(),
            status: sr.status,
            DriverId: sr.DriverId,
            points,
            thisInterval: getInterval(distanceMatrix?.duration?.value),
         };
      }
      if (
         sr.status === "started" &&
         (!location.startedWithTraffic ||
            sr.DriverId !== location.startedWithTraffic?.DriverId)
      ) {
         location["startedWithTraffic"] = {
            driverDistanceMatrix: distanceMatrix,
            createdAt: moment().toISOString(),
            status: sr.status,
            DriverId: sr.DriverId,
            points,
            thisInterval: getInterval(distanceMatrix?.duration?.value),
         };
      }
      if (
         sr.status === "accepted" &&
         (!location.acceptedWithTraffic ||
            sr.DriverId !== location.acceptedWithTraffic?.DriverId)
      ) {
         location["acceptedWithTraffic"] = {
            driverDistanceMatrix: distanceMatrix,
            createdAt: moment().toISOString(),
            status: sr.status,
            DriverId: sr.DriverId,
            points,
            thisInterval: getInterval(distanceMatrix?.duration?.value),
         };
      }
      // console.log(
      //    sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
      //       ?.distance?.value
      // );
      // console.log(distanceMatrix.distance.value);
      // console.log(
      //    sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
      //       ?.duration?.value
      // );
      // console.log(distanceMatrix?.duration.value);
      // console.log(sr.location?.lastUpdatedDistanceAndDuration?.status);
      // console.log(sr.status);
      // console.log(
      //    sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
      //       ?.distance.value > distanceMatrix?.distance?.value &&
      //       distanceMatrix.duration.value <
      //          sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
      //             ?.duration.value &&
      //       sr.status === sr.location?.lastUpdatedDistanceAndDuration?.status
      // );
      if (
         distanceMatrix.duration.value * 0.95 <
            sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
               ?.duration.value &&
         sr.status === sr.location?.lastUpdatedDistanceAndDuration?.status
      ) {
         move = true;
      } else if (
         sr.status === sr.location?.lastUpdatedDistanceAndDuration?.status
      ) {
         moveAfter =
            distanceMatrix.duration.value -
            sr.location?.lastUpdatedDistanceAndDuration?.driverDistanceMatrix
               ?.duration.value;
      }
      await ServiceRequest.update(
         {
            location,
         },
         {
            where: {
               id: reqId,
            },
         }
      );
      return { move, moveAfter };
   }
   async getDurationAndDistance(
      driverLocation,
      curClientLocation,
      wayPoints,
      from,
      reqId,
      status,
      traffic
   ) {
      let waypoints = wayPoints.length > 0 ? wayPoints : undefined;
      let config = await Config.findOne();
      let usageMap = config.usageMap;
      let move;
      let moveAfter;
      let points;
      let driverDistanceMatrix;
      if (usageMap == 1) {
         let key = process.env.GOOGLE_MAPS_API_KEY;
         if (from === "mobile") {
            key = process.env.GOOGLE_MAPS_API_KEY_MOBILE;
         } else if (from === "dashboard") {
            key = process.env.GOOGLE_MAPS_API_KEY_DASHBOARD;
         }
         let routes = await DriverFunctions.directionDistances(
            driverLocation,
            curClientLocation,
            waypoints,
            from,
            reqId,
            key
         );
         let legs = routes.legs;
         let pointsString = routes.overview_polyline.points;
         points = polyUtil.decode(pointsString);
         let driverDistanceMatrixx = await this.returnTimeAndDistance(
            reqId,
            legs,
            status,
            points
         );
         driverDistanceMatrix = driverDistanceMatrixx.driverDistanceMatrix;
         move = driverDistanceMatrixx.move;
      } else {
         let obj = {
            started: 1,
            destArrived: 1,
         };
         let obj2 = {
            accepted: 1,
            arrived: 1,
         };
         let key = process.env.MAPBOX_TOKEN;
         // if (from === "mobile") {
         //    key = process.env.MAPBOX_TOKEN_MOBILE;
         // } else if (from === "dashboard") {
         //    key = process.env.MAPBOX_TOKEN_DASHBOARD;
         // }
         let routes = await DriverFunctions.directionDistancesMapBox(
            driverLocation,
            curClientLocation,
            waypoints,
            from,
            reqId,
            key,
            traffic
         );
         let legs = routes.legs;
         let duration = routes.duration;
         if (obj[status]) {
            duration += config.finishTime * 60;
         }
         if (obj2[status]) {
            duration += config.finishTime * 60 + config.carryingTime * 60;
         }
         driverDistanceMatrix = {
            distance: {
               value: Math.ceil(routes.distance),
               text: `${Math.ceil(routes.distance / 100) / 10} km`,
            },
            duration: {
               value: Math.ceil(duration),
               text: returnTheRightText(duration),
            },
         };
         // console.log(routes.geometry.coordinates);
         points = routes.geometry.coordinates.map(([x, y]) => [y, x]);
         // console.log(points);
      }
      if (reqId) {
         let moves = await this.updateLastAndFirstHits(
            reqId,
            driverDistanceMatrix,
            points
         );
         move = moves.move;
         moveAfter = moves.moveAfter;
      }
      return {
         driverDistanceMatrix,
         points,
         move,
         moveAfter,
      };
   }
   async getWayPointsFromDriver(request, requests) {
      let waypoints = [];

      if (requests.length === 0) {
         return [];
      }
      requests.map((request) => {
         waypoints.push(
            `${request.location.clientLatitude},${request.location.clientLongitude}`
         );
      });
      return waypoints;
   }
   async returnTimeAndDistanceOtherServices(request, legs, points, requests) {
      let move;
      let config = await Config.findOne();
      // let obj = {
      //    started: 1,
      //    destArrived: 1,
      // };
      // let obj2 = {
      //    accepted: 1,
      //    arrived: 1,
      // };
      // if (obj[status]) {
      //    let driverDistanceMatrixForDestination = {
      //       distance: legs[0].distance,
      //       duration: legs[0].duration,
      //    };
      //    let driverDistanceMatrixFromDestination = {
      //       distance: legs[1].distance,
      //       duration: legs[1].duration,
      //    };
      //    let distanceValue =
      //       driverDistanceMatrixFromDestination.distance.value +
      //       driverDistanceMatrixForDestination.distance.value;
      //    let durationValue =
      //       driverDistanceMatrixForDestination.duration.value +
      //       driverDistanceMatrixFromDestination.duration.value +
      //       config.finishTime * 60;
      //    let driverDistanceMatrix = {
      //       distance: {
      //          value: distanceValue,
      //          text: `${Math.ceil(distanceValue / 100) / 10} km`,
      //       },
      //       duration: {
      //          value: durationValue,
      //          text:  returnTheRightText(durationValue),
      //       },
      //    };
      //    if (reqId) {
      //       move = await this.updateLastAndFirstHits(
      //          reqId,
      //          driverDistanceMatrix,
      //          points
      //       );
      //    }
      //    return { driverDistanceMatrix, move };
      // }
      // if (obj2[status]) {
      //    let driverAndDistanceForClient = {
      //       distance: legs[0].distance,
      //       duration: legs[0].duration,
      //    };
      //    let driverDistanceMatrixForDestination = {
      //       distance: legs[1].distance,
      //       duration: legs[1].duration,
      //    };
      //    let driverDistanceMatrixFromDestination = {
      //       distance: legs[2].distance,
      //       duration: legs[2].duration,
      //    };
      //    let distanceValue =
      //       driverAndDistanceForClient.distance.value +
      //       driverDistanceMatrixFromDestination.distance.value +
      //       driverDistanceMatrixForDestination.distance.value;
      //    let durationValue =
      //       driverAndDistanceForClient.duration.value +
      //       driverDistanceMatrixForDestination.duration.value +
      //       driverDistanceMatrixFromDestination.duration.value +
      //       config.finishTime * 60 +
      //       config.carryingTime * 60;
      //    let driverDistanceMatrix = {
      //       distance: {
      //          value: distanceValue,
      //          text: `${Math.ceil(distanceValue / 100) / 10} km`,
      //       },
      //       duration: {
      //          value: durationValue,
      //          text:  returnTheRightText(durationValue),
      //       },
      //    };
      //    if (reqId) {
      //       move = await this.updateLastAndFirstHits(
      //          reqId,
      //          driverDistanceMatrix,
      //          points
      //       );
      //    }
      //    return { driverDistanceMatrix, move };
      // }
      let totalDistanceValue = 0;
      let totalDurationValue = 0;
      for (let i = 0; i < legs.length; i++) {
         totalDistanceValue += legs[i].distance.value;
         totalDurationValue += legs[i].duration.value;
      }
      for (let k = 0; k < requests.length; k++) {
         const element = requests[k];
         let request = requests[i];
         let services = request.CarServiceTypes;
         for (let j = 0; j < services.length; j++) {
            switch (services[j].en_name) {
               case "Fuel":
                  totalDurationValue += config.fuelServiceTime * 60;
                  break;
               case "Batteries":
                  totalDurationValue += config.batteryServiceTime * 60;
                  break;
               case "Tires Fix":
                  totalDurationValue += config.tiresServiceTime * 60;
                  break;
            }
         }
      }
      let driverDistanceMatrix = {
         distance: {
            value: totalDistanceValue,
            text: `${Math.ceil(totalDistanceValue / 100) / 10} km`,
         },
         duration: {
            value: totalDurationValue,
            text: returnTheRightText(totalDurationValue),
         },
      };
      // driverDistanceMatrixForDestination = {
      //    distance: legs[0].distance,
      //    duration: legs[0].duration,
      // };
      // let driverDistanceMatrix = {
      //    distance: legs[0].distance,
      //    duration: legs[0].duration,
      // };
      if (reqId) {
         move = await this.updateLastAndFirstHits(
            reqId,
            driverDistanceMatrix,
            points
         );
      }
      return { driverDistanceMatrix, move };
   }
   async getDurationAndDistanceOtherServices(
      driverLocation,
      curClientLocation,
      wayPoints,
      from,
      reqId,
      status,
      traffic
   ) {
      let waypoints = wayPoints.length > 0 ? wayPoints : undefined;
      let config = await Config.findOne();
      let usageMap = config.usageMap;
      let move;
      let moveAfter;
      let points;
      let driverDistanceMatrix;
      let request;
      let requests;
      if (reqId) {
         request = await ServiceRequest.findByPk(reqId);
         requests = await ServiceRequest.findAll({
            where: {
               DriverId: request?.DriverId,
               id: {
                  [Op.ne]: request.id,
               },
               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
               createdAt: {
                  [Op.lte]: request.createdAt,
               },
            },
         });
         request = request.get({ plain: true });
         waypoints = await this.getWayPointsFromDriver(request, requests);
      }
      if (usageMap == 1) {
         let key = process.env.GOOGLE_MAPS_API_KEY;
         if (from === "mobile") {
            key = process.env.GOOGLE_MAPS_API_KEY_MOBILE;
         } else if (from === "dashboard") {
            key = process.env.GOOGLE_MAPS_API_KEY_DASHBOARD;
         }
         let routes = await DriverFunctions.directionDistances(
            driverLocation,
            curClientLocation,
            waypoints,
            from,
            reqId,
            key
         );
         let legs = routes.legs;
         let pointsString = routes.overview_polyline.points;
         points = polyUtil.decode(pointsString);
         let driverDistanceMatrixx =
            await this.returnTimeAndDistanceOtherServices(
               request,
               legs,
               points,
               requests
            );
         driverDistanceMatrix = driverDistanceMatrixx.driverDistanceMatrix;
         move = driverDistanceMatrixx.move;
      } else {
         let obj = {
            started: 1,
            destArrived: 1,
         };
         let obj2 = {
            accepted: 1,
            arrived: 1,
         };
         let key = process.env.MAPBOX_TOKEN;
         // if (from === "mobile") {
         //    key = process.env.MAPBOX_TOKEN_MOBILE;
         // } else if (from === "dashboard") {
         //    key = process.env.MAPBOX_TOKEN_DASHBOARD;
         // }
         let routes = await DriverFunctions.directionDistancesMapBox(
            driverLocation,
            curClientLocation,
            waypoints,
            from,
            reqId,
            key,
            traffic
         );
         let legs = routes.legs;
         let duration = routes.duration;

         for (let k = 0; k < requests.length; k++) {
            const element = requests[k];
            let request = requests[i];
            let services = request.CarServiceTypes;
            for (let j = 0; j < services.length; j++) {
               switch (services[j].en_name) {
                  case "Fuel":
                     totalDurationValue += config.fuelServiceTime * 60;
                     break;
                  case "Batteries":
                     totalDurationValue += config.batteryServiceTime * 60;
                     break;
                  case "Tires Fix":
                     totalDurationValue += config.tiresServiceTime * 60;
                     break;
               }
            }
         }
         driverDistanceMatrix = {
            distance: {
               value: totalDistanceValue,
               text: `${Math.ceil(totalDistanceValue / 100) / 10} km`,
            },
            duration: {
               value: totalDurationValue,
               text: returnTheRightText(totalDurationValue),
            },
         };

         // console.log(routes.geometry.coordinates);
         points = routes.geometry.coordinates.map(([x, y]) => [y, x]);
         // console.log(points);
      }
      if (reqId) {
         let moves = await this.updateLastAndFirstHits(
            reqId,
            driverDistanceMatrix,
            points
         );
         move = moves.move;
         moveAfter = moves.moveAfter;
      }
      return {
         driverDistanceMatrix,
         points,
         move,
         moveAfter,
      };
   }
}

const decodeImages = (imageName, image) => {
   // const base64Image = image.split(';base64,').pop();
   let filename = `/public/users/drivers/${imageName}.jpg`;
   require("fs").writeFile(`.${filename}`, image, "base64", function (err) {
      if (err) console.error(err);
   });
   return filename;
};

function getInterval(value) {
   if (value < 5 * 60 + 1) {
      return 60;
   } else if (value > 5 * 60 && value < 10 * 60 + 1) {
      return 1 * 60;
   } else if (value > 10 * 60 && value < 30 * 60) {
      return 2 * 60;
   } else if (value > 30 * 60 - 1 && value < 60 * 60) {
      return 5 * 60;
   } else {
      return 10 * 60;
   }
}

function returnTheRightText(value) {
   const minutes = Math.floor(value / 60);
   const hours = Math.floor(minutes / 60);
   const remainingMinutes = minutes % 60;

   if (hours > 0) {
      return `${hours} hours, ${remainingMinutes} mins`;
   } else {
      return `${remainingMinutes} mins`;
   }
}

const driverService = new DriverService();
module.exports = driverService;
