const cron = require("node-cron");
const { Op } = require("sequelize");
const ServiceRequest = require("../models/ServiceRequest");
const driverService = require("../services/DriverService");
const fcm = require("../services/FcmFunctions");
const originalFees = require("../services/service_requests/originalFees");
const CarServiceType = require("../models/CarServiceType");

async function getConfirmedRequests() {
   let requests = await ServiceRequest.findAll({
      where: {
         updatedAt: {
            [Op.lte]: Date.now() - 90 * 1000,
         },
         status: "confirmed",
         reject: false,
      },
      include: [CarServiceType],
   });
   requests = requests.map((request) => request.get({ plain: true }));
   let validTypes = {
      4: 1,
      5: 1,
   };
   requests = requests.filter((request) => {
      return validTypes(request.CarServiceType[0]) ? true : false;
   });
   return requests;
}

const changeDriver = cron.schedule("*/30 * * * * *", async () => {
   const requests = await getConfirmedRequests();
   if (requests.length === 0) {
      // passed
   } else {
      // working
      let requestsId = requests.map((request) => request.id);
      let driver;
      for (let i = 0; i < requestsId.length; i++) {
         let request = requests[i];
         let oldDriverId = request.DriverId;
         let oldDriver = await driverService.getDriverById(oldDriverId);
         let driverChange = await driverService.changeDriver(requestsId[i]);
         if (driverChange.statusCode) {
            // continue;
            driver = await driverService.getDriverById(oldDriverId);
            // fcm.sendNotification(driver.fcmtoken, 'helpoo', 'تم استقبال طلب جديد');
         } else {
            driver = driverChange.driver;
            // let newDestination = await originalFees.getCalculateDistance(
            //    driverChange.distance,
            //    request.location.destinationDistance
            // );
            // if (
            //    request.location.destinationDistance.distance.value >=
            //    newDestination.distance.value
            // ) {
            // } else {
            //    let newOriginalFees = await originalFees.getOriginalFees(
            //       driverChange.carServiceTypeIds,
            //       driverChange.distance,
            //       newDestination
            //    );
            //    let discount = request.discountPercentage
            //       ? request.discountPercentage
            //       : 0;
            //    let newFees =
            //       newOriginalFees - (discount * newOriginalFees) / 100;
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
            //                id: request.id,
            //             },
            //          }
            //       );
            //    } else {
            //    }
            // }
         }
         if (driver.id !== oldDriverId) {
            fcm.sendNotification(
               oldDriver.fcmtoken,
               "helpoo",
               "تم الغاء الطلب الخاص بك"
            );
         }
         fcm.sendNotification(
            driverChange.driver.fcmtoken,
            "helpoo",
            "تم استقبال طلب جديد"
         );
         continue;
      }
   }
});

module.exports = changeDriver;
