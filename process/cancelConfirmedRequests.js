const os = require("os");
const cron = require("node-cron");
const { Op } = require("sequelize");
const ServiceRequest = require("../models/ServiceRequest");
const serviceRequestService = require("../services/ServiceRequestService");

async function getConfirmedRequests() {
   let requests = await ServiceRequest.findAll({
      where: {
         createdAt: {
            [Op.lte]: Date.now() - 60 * 30 * 1000,
         },
         status: "confirmed",
         reject: false,
      },
   });
   requests = requests.map((request) => request.get({ plain: true }));
   return requests;
}

const cancelRequests = cron.schedule("*/30 * * * * *", async () => {
   let serverIp = os.networkInterfaces()["eth0"][0].address;
   // console.log(serverIp);
   if (serverIp === "89.117.61.172") {
      // console.log("on dev server");
      const requests = await getConfirmedRequests();
      if (requests.length === 0) {
         // passed
      } else {
         // working
         let requestsId = requests.map((request) => request.id);
         // console.log(requestsId);
         for (let i = 0; i < requestsId.length; i++) {
            await serviceRequestService.cancelRequest(requestsId[i]);
            //      let request = requests[i];
            //      let oldDriverId = request.DriverId;
            //      let oldDriver = await driverService.getDriverById(oldDriverId);
            //      let driverChange = await driverService.changeDriver(requestsId[i]);
            //      if (driverChange.statusCode) {
            //         // continue;
            //         driver = await driverService.getDriverById(oldDriverId);
            //         // fcm.sendNotification(driver.fcmtoken, 'helpoo', 'تم استقبال طلب جديد');
            //      } else {
            //         driver = driverChange.driver;
            //         let newDestination = await originalFees.getCalculateDistance(
            //            driverChange.distance,
            //            request.location.destinationDistance
            //         );
            //         if (
            //            request.location.destinationDistance.distance.value >=
            //            newDestination.distance.value
            //         ) {
            //         } else {
            //            let newOriginalFees = await originalFees.getOriginalFees(
            //               driverChange.carServiceTypeIds,
            //               driverChange.distance,
            //               newDestination
            //            );
            //            let discount = request.discountPercentage
            //               ? request.discountPercentage
            //               : 0;
            //            let newFees =
            //               newOriginalFees - (discount * newOriginalFees) / 100;
            //            request.location.calculatedDistance = newDestination;
            //            if (newFees > Number(request.fees) * 1.25) {
            //               let location = request.location;
            //               await ServiceRequest.update(
            //                  {
            //                     fees: newFees,
            //                     originalFees: newOriginalFees,
            //                     location,
            //                  },
            //                  {
            //                     where: {
            //                        id: request.id,
            //                     },
            //                  }
            //               );
            //            } else {
            //            }
            //         }
            //      }
            //      if (driver.id !== oldDriverId) {
            //         fcm.sendNotification(
            //            oldDriver.fcmtoken,
            //            "helpoo",
            //            "تم الغاء الطلب الخاص بك"
            //         );
            //      }
            //      fcm.sendNotification(
            //         driverChange.driver.fcmtoken,
            //         "helpoo",
            //         "تم استقبال طلب جديد"
            //      );
            //      continue;
         }
      }
   }
});

module.exports = cancelRequests;
