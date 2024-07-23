const { Op } = require("sequelize");
const CarServiceType = require("../../models/CarServiceType");
const ServiceRequest = require("../../models/ServiceRequest");
const AppError = require("../../utils/AppError");

class OriginalFees {
   async getOriginalFees(carServiceTypeId, distance, destinationDistance) {
      if (Array.isArray(carServiceTypeId)) {
         let carServiceTypes = await CarServiceType.findAll({
            where: {
               id: {
                  [Op.in]: carServiceTypeId,
               },
            },
         });
         let maxCost = 0;
         let totalBaseCost = 0;
         carServiceTypes = carServiceTypes.map((carServiceType) =>
            carServiceType.get({ plain: true })
         );
         for (let i = 0; i < carServiceTypes.length; i++) {
            totalBaseCost += carServiceTypes[i].base_cost;
            maxCost = Math.max(maxCost, carServiceTypes[i].costPerKm);
         }
         if (destinationDistance == null) {
            return Math.ceil(
               Math.ceil(distance.distance.value / 1000) * maxCost +
                  totalBaseCost
            );
         } else {
            return Math.ceil(
               Math.ceil(destinationDistance.distance.value / 1000) * maxCost +
                  totalBaseCost
            );
         }
      }
      const carServiceType = await CarServiceType.findOne({
         where: {
            id: carServiceTypeId,
         },
      });
      if (!carServiceType) {
         throw new Error("Specify Requirements carServiceType");
      }
      // if (!distance) {
      //   throw new Error("Specify Requirements distance");
      // }

      if (destinationDistance == null) {
         return (
            Math.ceil(distance.distance.value / 1000) *
               carServiceType.dataValues.costPerKm +
            carServiceType.dataValues.base_cost
         );
      } else {
         return (
            Math.ceil(destinationDistance.distance.value / 1000) *
               carServiceType.dataValues.costPerKm +
            carServiceType.dataValues.base_cost
         );
      }
   }
   async getOriginalFeesKM(carServiceTypeId, distance, destinationDistance) {
      if (Array.isArray(carServiceTypeId)) {
         let carServiceTypes = await CarServiceType.findAll({
            where: {
               id: {
                  [Op.in]: carServiceTypeId,
               },
            },
         });
         let maxCost = 0;
         carServiceTypes = carServiceTypes.map((carServiceType) =>
            carServiceType.get({ plain: true })
         );
         for (let i = 0; i < carServiceTypes.length; i++) {
            maxCost = Math.max(maxCost, carServiceTypes[i].costPerKm);
         }
         if (destinationDistance == null) {
            return Math.ceil(distance.distance.value / 1000) * maxCost;
         } else {
            return (
               Math.ceil(destinationDistance.distance.value / 1000) * maxCost
            );
         }
      }
      const carServiceType = await CarServiceType.findOne({
         where: {
            id: carServiceTypeId,
         },
      });
      if (!carServiceType) {
         throw new Error("Specify Requirements carServiceType");
      }
      // if (!distance) {
      //   throw new Error("Specify Requirements distance");
      // }

      if (destinationDistance == null) {
         return (
            Math.ceil(distance.distance.value / 1000) *
            carServiceType.dataValues.costPerKm
         );
      } else {
         return (
            Math.ceil(destinationDistance.distance.value / 1000) *
            carServiceType.dataValues.costPerKm
         );
      }
   }
   async getCalculateDistance(distance, destinationDistance) {
      if (!distance && !destinationDistance) {
         return new AppError(
            "Please send distance or destination distance",
            400
         );
      } else if (!distance) {
         return destinationDistance;
      } else if (!destinationDistance) {
         return distance;
      } else if (
         Math.ceil(destinationDistance.distance.value / 1000) >=
         Math.ceil(distance.distance.value / 1000)
      ) {
         return destinationDistance;
      } else if (
         Math.ceil(distance.distance.value / 1000) >
         Math.ceil(destinationDistance.distance.value / 1000)
      ) {
         // let difference =
         //    distance.distance.value - destinationDistance.distance.value;
         // destinationDistance.distance.value += difference;
         return destinationDistance;

         let valueOne = Number(destinationDistance.distance.value);
         let valueTwo = Number(distance.distance.value);
         let value = valueOne + valueTwo;

         value /= 2;
         let newDestinationDistance = {
            distance: {
               value: Math.ceil(value),
            },
         };
         return newDestinationDistance;
      } else {
         return new AppError("Please callcenter", 400);
      }
   }
   async getOtherServicesOriginalFees(
      carServicesIds,
      carServicesWithUsage,
      distance
   ) {
      let maxCost = 0;
      let totalBaseCost = 0;
      let carServiceTypes = await CarServiceType.findAll({
         where: {
            id: {
               [Op.in]: carServicesIds,
            },
         },
      });
      for (let i = 0; i < carServiceTypes.length; i++) {
         // console.log(carServiceTypes[i].base_cost);
         // console.log(totalBaseCost);
         totalBaseCost += carServiceTypes[i].base_cost;
         // console.log(totalBaseCost);
         if (
            carServicesWithUsage[String(carServiceTypes[i].id)] >
            carServiceTypes[i].maxUsage
         ) {
            throw new AppError(
               "You can't order more than " +
                  carServiceTypes[i].maxUsage +
                  " for this service " +
                  carServiceTypes[i].en_name,
               400
            );
         }
         // console.log(totalBaseCost);
         // console.log(carServicesWithUsage[carServiceTypes[i].id]);
         // console.log(carServiceTypes[i].usagePrice);
         // console.log(
         //    carServicesWithUsage[carServiceTypes[i].id] *
         //       carServiceTypes[i].usagePrice
         // );
         totalBaseCost +=
            carServicesWithUsage[carServiceTypes[i].id] *
            carServiceTypes[i].usagePrice;
         // console.log(totalBaseCost);
         maxCost = Math.max(maxCost, carServiceTypes[i].costPerKm);
      }
      return Math.ceil(
         Math.ceil(distance.distance.value / 1000) * maxCost + totalBaseCost
      );
   }
}

const originalFees = new OriginalFees();
module.exports = originalFees;
