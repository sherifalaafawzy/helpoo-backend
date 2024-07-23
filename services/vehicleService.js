// NPM Lib
const { Op } = require("sequelize");

// Models
const Driver = require("../models/Driver");
const VehicleTypes = require("../models/VehicleType");
const VehicleModel = require("../models/Vehicle");
const CarServiceType = require("../models/CarServiceType");
const User = require("../models/User");
// Utils
const AppError = require("../utils/AppError");

class Vehicle {
   async createVehicle(data) {
      try {
         const existVehicle = await VehicleModel.findOne({
            where: {
               [Op.or]: [
                  {
                     Vec_plate: data.Vec_plate,
                  },
                  {
                     Vec_num: data.Vec_num,
                  },
               ],
            },
         });
         if (existVehicle) {
            return new AppError(
               "This Vehicle already exists , check plate or vec number ",
               400
            );
         }
         // const existIMEI = await VehicleModel.findOne({
         //    where: {
         //       IMEI: data.IMEI,
         //    },
         // });
         // if (existIMEI) {
         //    return new AppError("This IMEI already exists", 400);
         // }
         const vehicle = await VehicleModel.create(data);

         vehicle.addCarServiceTypes(data.carServiceType);

         return vehicle;
      } catch (err) {
         // console.log(err);
         throw err;
         // return new AppError(err.message, 500);
      }
   }
   async vehicleStats() {
      let allVehicles = await VehicleModel.findAndCountAll();
      let onlineVehicles = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
         },
      });
      let offlineVehicles = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.eq]: null,
            },
         },
      });
      let busyVehicles = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: false,
         },
      });
      let availableVehicles = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: true,
         },
      });
      let onlineAndWorkingDrivers = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
         },
         include: [
            {
               model: Driver,
               where: {
                  offline: false,
                  // open: true,
               },
               include: [User],
            },
         ],
      });
      let onlineAndNotWorkingDrivers = await VehicleModel.findAndCountAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
         },
         include: [
            {
               model: Driver,
               where: {
                  offline: false,
                  // open: false,
               },
               include: [User],
            },
         ],
      });
      return {
         allVehicles,
         onlineVehicles,
         offlineVehicles,
         busyVehicles,
         availableVehicles,
         onlineAndWorkingDrivers,
         onlineAndNotWorkingDrivers,
      };
   }
   async getAllTypes() {
      let types = await VehicleTypes.findAll();
      return types;
   }

   async getAllVehicles() {
      const vehicles = await VehicleModel.findAll({
         include: [Driver, VehicleTypes, CarServiceType],
      });
      return vehicles;
   }

   async getVehicle(vehicleId) {
      const vehicle = await VehicleModel.findByPk(vehicleId, {
         include: [Driver, VehicleTypes, CarServiceType],
      });
      if (!vehicle) return new AppError("There's no vehicle with this id", 400);
      return vehicle;
   }

   async getVehicleByDriverId(driverId) {
      let vehicle = await VehicleModel.findOne({
         where: {
            Active_Driver: driverId,
         },
         include: [VehicleTypes],
      });
      if (!vehicle)
         return new AppError(
            "There's no vehicle associated with this driver",
            400
         );
      vehicle = vehicle.get({ plain: true });
      return vehicle;
   }

   async updateVehicle({ data, vehicleId }) {
      const update = await VehicleModel.update(
         {
            ...data,
         },
         {
            where: {
               id: vehicleId,
            },
         }
      );
      const vehicle = await VehicleModel.findByPk(vehicleId, {
         include: [Driver, VehicleTypes, CarServiceType],
      });
      return vehicle;
   }

   async getAllOnlineVehicles() {
      let vehicles = await VehicleModel.findAll({
         include: [
            {
               model: Driver,
               include: [User],
               where: {
                  offline: false,
               },
            },
            CarServiceType,
            VehicleTypes,
         ],
      });
      if (!vehicles) return new AppError("No Vehicles available", 400);
      vehicles = vehicles.map((vehicle) => vehicle.get({ plain: true }));
      return vehicles;
   }

   async getAllAvailableVehicles(carServiceTypes) {
      let vehicles = await VehicleModel.findAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: true,
         },
         include: [
            {
               model: Driver,
               include: [User],
            },
            VehicleTypes,
            {
               model: CarServiceType,
               where: {
                  id: {
                     [Op.or]: carServiceTypes,
                  },
               },
            },
         ],
      });
      if (vehicles.length === 0 || !vehicles) return [];
      // return new AppError("No Vehicles available", 400);
      vehicles = vehicles.map((vehicle) => vehicle.get({ plain: true }));
      return vehicles;
   }
   async getAllNotAvailableVehicles(carServiceTypes) {
      let vehicles = await VehicleModel.findAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: false,
         },
         include: [
            {
               model: Driver,
               include: [User],
            },
            VehicleTypes,
            {
               model: CarServiceType,
               where: {
                  id: {
                     [Op.or]: carServiceTypes,
                  },
               },
            },
         ],
      });
      if (vehicles.length === 0 || !vehicles) return [];
      // return new AppError("No Vehicles available", 400);
      vehicles = vehicles.map((vehicle) => vehicle.get({ plain: true }));
      return vehicles;
   }
   async getAllAvailableVehiclesOtherServices(carServiceTypes, fuelUsage) {
      let vehicles = await VehicleModel.findAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: true,
         },
         include: [
            {
               model: Driver,
               include: [User],
            },
            VehicleTypes,
            {
               model: CarServiceType,
               where: {
                  id: {
                     [Op.or]: carServiceTypes,
                  },
               },
            },
         ],
      });
      if (vehicles.length === 0 || !vehicles) return [];
      // return new AppError("No Vehicles available", 400);
      vehicles = vehicles.map((vehicle) => vehicle.get({ plain: true }));
      return vehicles;
   }
   async getAllNotAvailableVehiclesOtherServices(carServiceTypes, fuelUsage) {
      let vehicles = await VehicleModel.findAll({
         where: {
            Active_Driver: {
               [Op.ne]: null,
            },
            available: false,
         },
         include: [
            {
               model: Driver,
               include: [User],
            },
            VehicleTypes,
            {
               model: CarServiceType,
               where: {
                  id: {
                     [Op.or]: carServiceTypes,
                  },
               },
            },
         ],
      });
      if (vehicles.length === 0 || !vehicles) return [];
      // return new AppError("No Vehicles available", 400);
      vehicles = vehicles.map((vehicle) => vehicle.get({ plain: true }));
      return vehicles;
   }
   async updateVehicleData(id, { PhoneNumber, Vec_plate, IMEI }) {
      let check = await VehicleModel.findByPk(id);
      if (!check) return new AppError("Not Found", 404);
      await VehicleModel.update(
         {
            PhoneNumber,
            Vec_plate,
            IMEI,
         },
         {
            where: {
               id,
            },
         }
      );
      let vehicle = await VehicleModel.findByPk(id);
      return vehicle;
   }
   async getVehicleWithIMEI(IMEI) {
      let vehicle = await VehicleModel.findOne({
         where: {
            IMEI,
         },
      });
      if (!vehicle) return new AppError("Not Found", 404);
      vehicle = vehicle.get({ plain: true });
      return vehicle;
   }

   // async deleteVehicle(vehicleId){
   //     // pass
   // }

   // async removeDriver(driverId){
   //     //pass
   // }
}

const vehicleService = new Vehicle();
module.exports = vehicleService;
