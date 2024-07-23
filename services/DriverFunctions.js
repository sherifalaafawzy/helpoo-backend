// NPM Lib
const { Client } = require("@googlemaps/google-maps-services-js");
const { Op } = require("sequelize");
const moment = require("moment");
// const DirectionsService = require("@mapbox/mapbox-sdk/services/directions");

// Models
const ServiceRequest = require("../models/ServiceRequest");
const Config = require("../models/Config");
const TrackingLogs = require("../models/TrackingLogs");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");

// Utils
const AppError = require("../utils/AppError");

// Services
const monthlyTrackingLogsService = require("./MonthlyTrackingLogsService");
const { default: axios } = require("axios");
const CarServiceType = require("../models/CarServiceType");

// Functions
function haversineDistance(mk1, mk2) {
   const earthRadius = 3958.58; // in miles
   const radianLat1 = mk1.lat * (Math.PI / 180); // convert to radians
   const radianLat2 = mk2.lat * (Math.PI / 180); // convert to radians
   const diffLat = radianLat2 - radianLat1;
   const diffLng = mk2.lng - mk1.lng;
   const calculations =
      2 *
      earthRadius *
      Math.asin(
         Math.sqrt(
            Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
               Math.cos(radianLat1) *
                  Math.cos(radianLat2) *
                  Math.sin(diffLng / 2) *
                  Math.sin(diffLng / 2)
         )
      );
   return calculations;
}
function checkTrueOrFalse(result) {
   return (
      result.status === "ZERO_RESULTS" ||
      result.distance === null ||
      result.duration === null ||
      result.distance.value === null ||
      result.duration.value === null
   );
}

class DriverFunctions {
   // async checkServiceType(request,driver) {}

   getHaversineDistance(location, driver) {
      if (driver.location === null) {
         return new AppError("No driver location sent", 400);
      }
      return {
         driver,
         distance: haversineDistance(
            {
               lat: location.clientLatitude,
               lng: location.clientLongitude,
            },
            {
               lat: driver.location.latitude,
               lng: driver.location.longitude,
            }
         ),
      };
   }

   async directionDistancesMapBox(
      driver,
      location,
      waypoints,
      from,
      requestId,
      key,
      traffic
   ) {
      // console.log(driver);
      // console.log(location);
      // console.log(waypoints);
      let WayPoints = "";
      if (waypoints) {
         waypoints = waypoints.map((waypoint) => {
            waypoint = waypoint.split(",");
            return `${waypoint[1]},${waypoint[0]}`;
         });
         WayPoints = waypoints.join(";");
      }
      // console.log(WayPoints);
      let urlMB = `https://api.mapbox.com/directions/v5/mapbox/driving/${
         driver.split(",")[1] + "," + driver.split(",")[0]
      };${WayPoints ? WayPoints + ";" : ""}${
         location.split(",")[1] + "," + location.split(",")[0]
      }?alternatives=true&geometries=geojson&language=en&overview=full&steps=true&access_token=${key}`;
      if (traffic) {
         urlMB = `https://api.mapbox.com/directions/v5/mapbox/driving/${
            driver.split(",")[1] + "," + driver.split(",")[0]
         };${WayPoints ? WayPoints + ";" : ""}${
            location.split(",")[1] + "," + location.split(",")[0]
         }?alternatives=true&geometries=geojson&language=en&overview=full&steps=true&depart_at=${moment().format(
            "YYYY-MM-DDTHH:mm"
         )}&access_token=${key}`;
      }
      // console.log(urlMB);
      let mapboxRes = await axios.get(urlMB);
      // let urlMB2 = `https://api.mapbox.com/directions/v5/mapbox/driving/${
      //    driver.split(",")[1] + "," + driver.split(",")[0]
      // };${WayPoints ? WayPoints + ";" : ""}${
      //    location.split(",")[1] + "," + location.split(",")[0]
      // }?alternatives=true&geometries=geojson&language=en&overview=full&steps=true&depart_at=${moment().format(
      //    "YYYY-MM-DDTHH:mm"
      // )}&access_token=${process.env.MAPBOX_TOKEN}`;
      // // console.log(urlMB);
      // let mapboxRes2 = await axios.get(urlMB2);
      // let routes = mapboxRes.data.routes.sort(
      //    (a, b) => a.distance - b.distance
      // );
      let routes = mapboxRes.data.routes;
      //    (a, b) => a.distance - b.distance
      // );
      // console.log(routes);
      let apiSave = traffic ? "directions/Mapbox-traffic" : "directions/Mapbox";
      await TrackingLogs.create({
         from,
         api: apiSave,
         requestId,
      });
      await monthlyTrackingLogsService.increaseMonthlyTrackingLog(
         from,
         apiSave
      );
      return routes[0];
   }

   async directionDistances(driver, location, waypoints, from, requestId, key) {
      let client = new Client({});
      let params = {
         key,
         origin: driver,
         destination: location,
         mode: "driving",
         departure_time: "now",
      };
      if (waypoints) {
         params["waypoints"] = waypoints;
      }
      // console.log(params);
      const res = await client.directions({
         params,
      });
      await TrackingLogs.create({
         from,
         api: "directions",
         requestId,
      });
      await monthlyTrackingLogsService.increaseMonthlyTrackingLog(
         from,
         "directions"
      );
      // console.log(res.data.routes[0].legs);
      // console.log(res.data.routes[0]);
      // console.log(res.data.routes[0].legs[0].duration);
      // console.log(res.data.routes[0].legs[0].distance);
      return res.data.routes[0];
   }

   async distanceMatrixMabBox(location, drivers) {
      let locationMB = [[location.clientLongitude, location.clientLatitude]];
      let driversLocationsMB = drivers.map((driver) => {
         return [driver.location.longitude, driver.location.latitude];
      });
      let url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${driversLocationsMB.join(
         ";"
      )};${locationMB.join(";")}?access_token=${
         process.env.MAPBOX_TOKEN
      }&annotations=distance,duration`;
      let mapBoxRes = await axios.get(url);

      let distancesMB = mapBoxRes.data.distances.slice(
         0,
         mapBoxRes.data.distances.length - 1
      );
      let durationsMB = mapBoxRes.data.durations.slice(
         0,
         mapBoxRes.data.durations.length - 1
      );
      let rows = [];
      for (let i = 0; i < distancesMB.length; i++) {
         rows.push({
            elements: [
               {
                  distance: {
                     value: Math.ceil(
                        distancesMB[i][distancesMB[i].length - 1]
                     ),
                     text: `${
                        Math.ceil(
                           distancesMB[i][distancesMB[i].length - 1] / 100
                        ) / 10
                     } km`,
                  },
                  duration: {
                     value: Math.ceil(
                        durationsMB[i][durationsMB[i].length - 1]
                     ),
                     text: returnTheRightText(
                        durationsMB[i][durationsMB[i].length - 1]
                     ),
                  },
               },
            ],
         });
      }
      return rows;
   }

   async distanceMatrixMany(location, drivers) {
      let client = new Client({});
      let driverLocations = drivers.map((driver) => {
         return {
            lat: driver.location.latitude,
            lng: driver.location.longitude,
         };
      });
      await TrackingLogs.create({
         from: "server",
         api: "distanceMatrix",
      });
      await monthlyTrackingLogsService.increaseMonthlyTrackingLog(
         "server",
         "distanceMatrix"
      );
      const res = await client.distancematrix({
         params: {
            key: process.env.GOOGLE_MAPS_API_KEY,
            origins: driverLocations,
            destinations: [
               {
                  lat: location.clientLatitude,
                  lng: location.clientLongitude,
               },
            ],
            mode: "driving",
         },
      });
      if (res.data === null) {
         console.error("invalid google distance matrix response");
         return null;
      }
      const result = res.data["rows"][0]["elements"][0];
      const result1 = res.data["rows"][1]["elements"][0];
      const result2 = res.data["rows"][2]["elements"][0];
      let trueOrFalse = checkTrueOrFalse(result);
      let trueOrFalse1 = checkTrueOrFalse(result1);
      let trueOrFalse2 = checkTrueOrFalse(result2);
      if (trueOrFalse) {
         if (trueOrFalse1) {
            if (trueOrFalse2) {
               console.error("invalid google distance matrix response data");
               return null;
            }
         }
      }
      // console.log(res.data.rows[0].elements);
      // console.log(res.data.rows[0].elements[0]);
      return res.data.rows;
   }

   async distanceMatrix(location, driver) {
      let client = new Client({});
      const res = await client.distancematrix({
         params: {
            key: process.env.GOOGLE_MAPS_API_KEY,
            origins: [
               {
                  lat: driver.location.latitude,
                  lng: driver.location.longitude,
               },
            ],
            destinations: [
               {
                  lat: location.clientLatitude,
                  lng: location.clientLongitude,
               },
            ],
            mode: "driving",
         },
      });
      if (res.data === null) {
         console.error("invalid google distance matrix response");
         return null;
      }
      const result = res.data["rows"][0]["elements"][0];
      if (
         result.status === "ZERO_RESULTS" ||
         result.distance === null ||
         result.duration === null ||
         result.distance.value === null ||
         result.duration.value === null
      ) {
         console.error("invalid google distance matrix response data");
         return null;
      }
      return result;
   }

   async validDrivers(driver, preventedId) {
      if (
         driver.id == null ||
         driver.id == preventedId ||
         driver.location == null ||
         driver.location.latitude == null ||
         driver.location.longitude == null ||
         // driver.blocked ||
         driver.offline
      ) {
         return false;
      }
      const request = await ServiceRequest.findOne({
         where: {
            DriverId: driver.id,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
         },
      });
      if (request) {
         await Driver.update(
            {
               available: false,
            },
            {
               where: {
                  id: driver.id,
               },
            }
         );
         await Vehicle.update(
            {
               available: false,
            },
            {
               where: {
                  Active_Driver: driver.id,
               },
            }
         );
         return false;
      }
      return true;
   }

   async validBusyDrivers(driver, preventedId) {
      if (
         driver.id == null ||
         driver.id == preventedId ||
         driver.location == null ||
         driver.location.latitude == null ||
         driver.location.longitude == null ||
         driver.offline 
      ) {
         return false;
      }
      const request = await ServiceRequest.findAll({
         where: {
            DriverId: driver.id,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
         },
      });
      if (request.length > 1 || request.length === 0) {
         if (request.length === 0) {
            await Driver.update(
               {
                  available: true,
               },
               {
                  where: {
                     id: driver.id,
                  },
               }
            );
            await Vehicle.update(
               {
                  available: true,
               },
               {
                  where: {
                     Active_Driver: driver.id,
                  },
               }
            );
         }
         return false;
      }

      let obj = {
         confirmed: 1,
      };

      if (request[0] && obj[request[0].status]) return false;
      return true;
   }
   async validBusyDriversOtherServices(driver, preventedId) {
      if (
         driver.id == null ||
         driver.id == preventedId ||
         driver.location == null ||
         driver.location.latitude == null ||
         driver.location.longitude == null ||
         driver.offline
      ) {
         return false;
      }
      const requests = await ServiceRequest.findAll({
         where: {
            DriverId: driver.id,
            status: {
               [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
            },
         },
      });
      if (requests.length === 0) {
         await Driver.update(
            {
               available: true,
            },
            {
               where: {
                  id: driver.id,
               },
            }
         );
         await Vehicle.update(
            {
               available: true,
            },
            {
               where: {
                  Active_Driver: driver.id,
               },
            }
         );

         return false;
      }

      let obj = {
         confirmed: 1,
      };
      if (requests.length > 1) return false;
      for (let i = 0; i < requests.length; i++) {
         if (requests[i] && obj[requests[i].status]) return false;
      }
      return true;
   }
   async filterDrivers(drivers, location, preventedId) {
      let filteredDrivers = [];
      for (let i in drivers) {
         let driver = drivers[i];
         const isValid = await this.validDrivers(driver, preventedId);
         if (isValid) {
            filteredDrivers.push(driver);
         }
      }

      if (filteredDrivers.length === 0 && drivers.length !== 0) {
         const driver = drivers[0];
         if (driver.id === preventedId) {
            return [driver];
         }
         return [];
      }

      drivers = filteredDrivers;
      return drivers;
   }
   async filterBusyDrivers(drivers, location, preventedId) {
      let filteredDrivers = [];

      for (let i in drivers) {
         let driver = drivers[i];
         const isValid = await this.validBusyDrivers(driver, preventedId);
         if (isValid) {
            filteredDrivers.push(driver);
         }
      }
      if (filteredDrivers.length === 0 && drivers.length !== 0) {
         const driver = drivers[0];
         if (driver.id === preventedId) {
            return [driver];
         }
         return [];
      }

      drivers = filteredDrivers;
      return drivers;
   }

   async filterBusyDriversOtherServices(drivers, location, preventedId) {
      let filteredDrivers = [];

      for (let i in drivers) {
         let driver = drivers[i];
         const isValid = await this.validBusyDriversOtherServices(
            driver,
            preventedId
         );
         if (isValid) {
            filteredDrivers.push(driver);
         }
      }
      if (filteredDrivers.length === 0 && drivers.length !== 0) {
         const driver = drivers[0];
         if (driver.id === preventedId) {
            return [driver];
         }
         return [];
      }

      drivers = filteredDrivers;
      return drivers;
   }

   async getTheNearest(location, drivers) {
      let distances = [];
      let config = await Config.findOne();
      for (let i in drivers) {
         const driver = drivers[i];
         let driverAndDistance = this.getHaversineDistance(location, driver);
         if (driverAndDistance.statusCode) continue;
         if (driverAndDistance !== null) {
            distances.push(driverAndDistance);
         }
      }

      if (distances.length === 0) {
         return null;
      }
      // sorting the drivers according to their haversine distance
      distances.sort((a, b) => a.distance - b.distance);
      // console.log(distances);
      let driversForMatrix = distances.slice(0, 3);
      // console.log(driversForMatrix);
      driversForMatrix = driversForMatrix.map((el) => el.driver);
      let locations;
      let usageMap = config.usageMap;
      if (usageMap === 1) {
         locations = await this.distanceMatrixMany(location, driversForMatrix);
      } else {
         locations = await this.distanceMatrixMabBox(
            location,
            driversForMatrix
         );
      }
      let driversWithMatrix = locations.map((el, i) => {
         // console.log(el);
         // console.log(el.elements[0]);
         return {
            driver: driversForMatrix[i],
            driverDistanceMatrix: el.elements[0],
         };
      });
      driversWithMatrix.sort(
         (a, b) =>
            a.driverDistanceMatrix.duration.value -
            b.driverDistanceMatrix.duration.value
      );
      // console.log(driversWithMatrix[0]);
      // console.log(driversWithMatrix[1]);
      // console.log(driversWithMatrix[2]);
      return driversWithMatrix[0];
   }
   async getTheNearestBusy(location, drivers) {
      let distances = [];
      for (let i in drivers) {
         const driver = drivers[i];
         let request = await ServiceRequest.findOne({
            where: {
               DriverId: driver.id,

               status: {
                  [Op.and]: {
                     [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
                  },
               },
            },
         });

         let obj = {
            started: 1,
            destArrived: 1,
         };
         let obj2 = {
            accepted: 1,
            arrived: 1,
         };
         let driverAndDistance;
         if (obj[request.status]) {
            let driverAndDistanceForDestination = this.getHaversineDistance(
               {
                  clientLatitude: request.location.destinationLat,
                  clientLongitude: request.location.destinationLng,
               },
               driver
            );
            if (driverAndDistanceForDestination.statusCode) continue;
            let driverAndDistanceFromDestination = this.getHaversineDistance(
               location,
               {
                  location: {
                     latitude: request.location.destinationLat,
                     longitude: request.location.destinationLng,
                  },
               }
            );
            if (driverAndDistanceFromDestination.statusCode) continue;
            driverAndDistance =
               driverAndDistanceFromDestination.distance +
               driverAndDistanceForDestination.distance;
            if (driverAndDistance !== null) {
               distances.push({ distance: driverAndDistance, driver });
            }
            continue;
         }
         if (obj2[request.status]) {
            let driverAndDistanceForClient = this.getHaversineDistance(
               request.location,
               driver
            );
            if (driverAndDistanceForClient.statusCode) continue;

            let driverAndDistanceForDestination = this.getHaversineDistance(
               {
                  clientLatitude: request.location.destinationLat,
                  clientLongitude: request.location.destinationLng,
               },
               {
                  location: {
                     latitude: request.location.clientLatitude,
                     longitude: request.location.clientLongitude,
                  },
               }
            );

            if (driverAndDistanceForDestination.statusCode) continue;
            let driverAndDistanceFromDestination = this.getHaversineDistance(
               location,
               {
                  location: {
                     latitude: request.location.destinationLat,
                     longitude: request.location.destinationLng,
                  },
               }
            );
            if (driverAndDistanceFromDestination.statusCode) continue;
            driverAndDistance =
               driverAndDistanceFromDestination.distance +
               driverAndDistanceForDestination.distance +
               driverAndDistanceForClient.distance;
            if (driverAndDistance !== null) {
               distances.push({ distance: driverAndDistance, driver });
            }
            continue;
         }
      }
      if (distances.length === 0) {
         return null;
      }
      // sorting the drivers according to their haversine distance
      distances.sort((a, b) => a.distance - b.distance);
      // get by google maps how long the distance in km and how much it takes him to arrive
      let finalTwo = [];
      let config = await Config.findOne();
      let obj = {
         started: 1,
         destArrived: 1,
      };
      let obj2 = {
         accepted: 1,
         arrived: 1,
      };

      for (let i in distances) {
         const driver = distances[i].driver;

         let request = await ServiceRequest.findOne({
            where: {
               DriverId: driver.id,

               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
            },
         });
         let usageMap = config.usageMap;

         let driverDistanceMatrix;
         let driverDistanceMatrixForDestination;
         let driverDistanceMatrixFromDestination;
         let driverAndDistanceForClient;
         let firstClientLocation;
         if (obj[request.status]) {
            let wayPoints = [
               `${request.location.destinationLat},${request.location.destinationLng}`,
            ];

            let driverLocation = `${driver.location.latitude},${driver.location.longitude}`;
            let clientLocation = `${location.clientLatitude},${location.clientLongitude}`;
            if (usageMap == 1) {
               let key = process.env.GOOGLE_MAPS_API_KEY;
               let routes = await this.directionDistances(
                  driverLocation,
                  clientLocation,
                  wayPoints,
                  "server",
                  undefined,
                  key
               );
               let legs = routes.legs;
               driverDistanceMatrixForDestination = {
                  distance: legs[0].distance,
                  duration: legs[0].duration,
               };
               driverDistanceMatrixFromDestination = {
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
               driverDistanceMatrix = {
                  distance: {
                     value: distanceValue,
                     text: `${Math.ceil(distanceValue / 100) / 10} km`,
                  },
                  duration: {
                     value: durationValue,
                     text: returnTheRightText(durationValue),
                  },
               };
            } else {
               let key = process.env.MAPBOX_TOKEN;
               let routes = await this.directionDistancesMapBox(
                  driverLocation,
                  clientLocation,
                  wayPoints,
                  "server",
                  undefined,
                  key,
                  true
               );
               let legs = routes.legs;
               let duration = routes.duration + config.finishTime * 60;

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
               driverDistanceMatrixFromDestination = {
                  distance: {
                     value: Math.ceil(legs[0].distance),
                     text: `${Math.ceil(legs[0].distance / 100) / 10} km`,
                  },
                  value: {
                     value: Math.ceil(legs[0].duration),
                     text: returnTheRightText(legs[0].duration),
                  },
               };
            }
         }
         if (obj2[request.status]) {
            let wayPoints = [
               `${request.location.clientLatitude},${request.location.clientLongitude}`,
               `${request.location.destinationLat},${request.location.destinationLng}`,
            ];
            let driverLocation = `${driver.location.latitude}, ${driver.location.longitude}`;
            let clientLocation = `${location.clientLatitude}, ${location.clientLongitude}`;

            if (usageMap == 1) {
               let key = process.env.GOOGLE_MAPS_API_KEY;

               let routes = await this.directionDistances(
                  driverLocation,
                  clientLocation,
                  wayPoints,
                  "server",
                  undefined,
                  key
               );
               let legs = routes.legs;
               driverAndDistanceForClient = {
                  distance: legs[0].distance,
                  duration: legs[0].duration,
               };
               driverDistanceMatrixForDestination = {
                  distance: legs[1].distance,
                  duration: legs[1].duration,
               };
               driverDistanceMatrixFromDestination = {
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
               driverDistanceMatrix = {
                  distance: {
                     value: distanceValue,
                     text: `${Math.ceil(distanceValue / 100) / 10} km`,
                  },
                  duration: {
                     value: durationValue,
                     text: returnTheRightText(durationValue),
                  },
               };
               firstClientLocation = {
                  latitude: request.location.clientLatitude,
                  longitude: request.location.clientLongitude,
               };
            } else {
               let key = process.env.MAPBOX_TOKEN;
               let routes = await this.directionDistancesMapBox(
                  driverLocation,
                  clientLocation,
                  wayPoints,
                  "server",
                  undefined,
                  key,
                  true
               );
               let legs = routes.legs;
               let duration =
                  routes.duration +
                  config.finishTime * 60 +
                  config.carryingTime * 60;

               driverDistanceMatrix = {
                  distance: {
                     value: Math.ceil(routes.distance),
                     text: `${Math.ceil(routes.distance / 100) / 10} km`,
                  },
                  duration: {
                     value: duration,
                     text: returnTheRightText(duration),
                  },
               };
               driverDistanceMatrixForDestination = {
                  distance: {
                     value: Math.ceil(legs[0].distance),
                     text: `${Math.ceil(legs[0].distance / 100) / 10} km`,
                  },
                  value: {
                     value: Math.ceil(legs[0].duration),
                     text: returnTheRightText(legs[0].duration),
                  },
               };
               driverDistanceMatrixFromDestination = {
                  distance: {
                     value: Math.ceil(legs[1].distance),
                     text: `${Math.ceil(legs[1].distance / 100) / 10} km`,
                  },
                  value: {
                     value: Math.ceil(legs[1].duration),
                     text: returnTheRightText(legs[1].duration),
                  },
               };
            }
         }
         if (finalTwo.length < 2) {
            finalTwo.push({
               driver,
               driverDistanceMatrix,
               driverDistanceMatrixForDestination,
               driverDistanceMatrixFromDestination,
               driverAndDistanceForClient,
               location: {
                  latitude: parseFloat(request.location.destinationLat),
                  longitude: parseFloat(request.location.destinationLng),
               },
               firstClientLocation,
               requestId: request.id,
            });
         } else {
            break;
         }
      }
      finalTwo.sort(
         (a, b) =>
            a.driverDistanceMatrix.duration.value -
            b.driverDistanceMatrix.duration.value
      );
      return finalTwo[0];
   }

   async getTheNearestBusyOtherServices(location, drivers) {
      let distances = [];
      for (let i in drivers) {
         const driver = drivers[i];
         let request = await ServiceRequest.findOne({
            where: {
               DriverId: driver.id,

               status: {
                  [Op.and]: {
                     [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
                  },
               },
            },
         });

         let obj = {
            started: 1,
            destArrived: 1,
         };
         let obj2 = {
            accepted: 1,
            arrived: 1,
         };
         let driverAndDistance;
         if (obj[request.status]) {
            // let driverAndDistanceForDestination = this.getHaversineDistance(
            //    {
            //       clientLatitude: request.location.destinationLat,
            //       clientLongitude: request.location.destinationLng,
            //    },
            //    driver
            // );
            // if (driverAndDistanceForDestination.statusCode) continue;
            let driverAndDistanceFromDestination = this.getHaversineDistance(
               location,
               {
                  location: {
                     latitude: request.location.clientLatitude,
                     longitude: request.location.clientLongitude,
                  },
               }
            );
            if (driverAndDistanceFromDestination.statusCode) continue;
            driverAndDistance = driverAndDistanceFromDestination.distance;
            if (driverAndDistance !== null) {
               distances.push({ distance: driverAndDistance, driver });
            }
            continue;
         }
         if (obj2[request.status]) {
            let driverAndDistanceForClient = this.getHaversineDistance(
               request.location,
               driver
            );
            if (driverAndDistanceForClient.statusCode) continue;

            // let driverAndDistanceForDestination = this.getHaversineDistance(
            //    location,
            //    {
            //       location: {
            //          latitude: request.location.clientLatitude,
            //          longitude: request.location.clientLongitude,
            //       },
            //    }
            // );

            // if (driverAndDistanceForDestination.statusCode) continue;
            let driverAndDistanceFromDestination = this.getHaversineDistance(
               location,
               {
                  location: {
                     latitude: request.location.clientLatitude,
                     longitude: request.location.clientLongitude,
                  },
               }
            );
            if (driverAndDistanceFromDestination.statusCode) continue;
            driverAndDistance =
               driverAndDistanceFromDestination.distance +
               // driverAndDistanceForDestination.distance +
               driverAndDistanceForClient.distance;
            if (driverAndDistance !== null) {
               distances.push({ distance: driverAndDistance, driver });
            }
            continue;
         }
      }
      if (distances.length === 0) {
         return null;
      }
      // sorting the drivers according to their haversine distance
      distances.sort((a, b) => a.distance - b.distance);
      // get by google maps how long the distance in km and how much it takes him to arrive
      let finalTwo = [];
      let config = await Config.findOne();
      let obj = {
         started: 1,
         destArrived: 1,
      };
      let obj2 = {
         accepted: 1,
         arrived: 1,
      };

      for (let i in distances) {
         const driver = distances[i].driver;

         let requests = await ServiceRequest.findAll({
            where: {
               DriverId: driver.id,

               status: {
                  [Op.notIn]: ["done", "canceled", "cancelWithPayment"],
               },
            },
            include: [CarServiceType],
         });
         let usageMap = config.usageMap;

         let driverDistanceMatrix;
         let driverDistanceMatrixForDestination;
         let driverDistanceMatrixFromDestination;
         let driverAndDistanceForClient;
         let firstClientLocation;
         let wayPoints = [];
         let driverLocation = `${driver.location.latitude},${driver.location.longitude}`;
         let clientLocation = `${location.clientLatitude},${location.clientLongitude}`;
         for (let i in requests) {
            let request = requests[i];
            if (obj[request.status]) {
               // wayPoints.push(
               //    `${request.location.destinationLat},${request.location.destinationLng}`
               // );
            }
            if (obj2[request.status]) {
               wayPoints.push(
                  `${request.location.clientLatitude},${request.location.clientLongitude}`
               );
            }
         }
         if (usageMap == 1) {
            let key = process.env.GOOGLE_MAPS_API_KEY;
            let routes = await this.directionDistances(
               driverLocation,
               clientLocation,
               wayPoints,
               "server",
               undefined,
               key
            );
            let legs = routes.legs;
            let totalDistanceValue = 0;
            let totalDurationValue = 0;
            for (let i = 0; i < legs.length; i++) {
               totalDistanceValue += leg[i].distance.value;
               totalDurationValue += leg[i].duration.value;
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
            driverDistanceMatrixForDestination = {
               distance: legs[0].distance,
               duration: legs[0].duration,
            };
         } else {
            let totalDistanceValue = 0;
            let totalDurationValue = 0;
            let key = process.env.MAPBOX_TOKEN;
            let routes = await this.directionDistancesMapBox(
               driverLocation,
               clientLocation,
               wayPoints,
               "server",
               undefined,
               key,
               true
            );
            let legs = routes.legs;
            totalDurationValue = routes.duration;
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
                  value: Math.ceil(routes.distance),
                  text: `${Math.ceil(routes.distance / 100) / 10} km`,
               },
               duration: {
                  value: Math.ceil(totalDurationValue),
                  text: returnTheRightText(totalDurationValue),
               },
            };
            let driverDistanceMatrixFromDestinationResponse =
               await this.directionDistancesMapBox(
                  `${requests[requests.length - 1].location.clientLatitude},${
                     requests[requests.length - 1].location.clientLongitude
                  }`,
                  clientLocation,
                  undefined,
                  "server",
                  undefined,
                  key,
                  true
               );
            driverDistanceMatrixFromDestination = {
               distance: {
                  value: Math.ceil(
                     driverDistanceMatrixFromDestinationResponse.distance
                  ),
                  text: `${
                     Math.ceil(
                        driverDistanceMatrixFromDestinationResponse.distance /
                           100
                     ) / 10
                  } km`,
               },
               value: {
                  value: Math.ceil(
                     driverDistanceMatrixFromDestinationResponse.duration
                  ),
                  text: returnTheRightText(
                     driverDistanceMatrixFromDestinationResponse.duration
                  ),
               },
            };
         }

         if (finalTwo.length < 2) {
            finalTwo.push({
               driver,
               driverDistanceMatrix,
               driverDistanceMatrixForDestination,
               driverDistanceMatrixFromDestination,
               driverAndDistanceForClient,
               location: {
                  latitude: parseFloat(requests[0].location.destinationLat),
                  longitude: parseFloat(requests[0].location.destinationLng),
               },
               firstClientLocation,
               requestId: requests[0].id,
            });
            if (finalTwo.length === 2) {
               break;
            }
         } else {
            break;
         }
      }
      finalTwo.sort(
         (a, b) =>
            a.driverDistanceMatrix.duration.value -
            b.driverDistanceMatrix.duration.value
      );
      return finalTwo[0];
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

const driverFunctions = new DriverFunctions();
module.exports = driverFunctions;
