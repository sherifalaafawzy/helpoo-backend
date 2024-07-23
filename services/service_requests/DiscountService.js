const { Op } = require("sequelize");
const corporateService = require("../CorporateService");
const PromoCodeUser = require("../../models/PromoCodeUser");
const PromoCode = require("../../models/PromoCode");
const Package = require("../../models/Package");
const ServiceRequest = require("../../models/ServiceRequest");
const moment = require("moment");
// const ServiceRequestService = require("../ServiceRequestService");
// const ServiceRequest = require("../ServiceRequestService")
const CarPackage = require("../../models/CarPackage");
const ClientPackage = require("../../models/ClientPackage");
const Car = require("../../models/Car");
const CarServiceType = require("../../models/CarServiceType");
const AppError = require("../../utils/AppError");
class DiscountService {
   async calculateDiscountAsCorporate(request) {
      const { corporateId, corporateUserId, original_fees } = request;
      let corporate;
      if (corporateId) {
         corporate = await corporateService.getUserCompany(corporateId);
      } else if (corporateUserId) {
         corporate = await corporateService.getUserCompanyByUserId(
            corporateUserId
         );
      } else {
         return { discount: 0, discountPercentage: 0 };
      }
      if (corporate.CorporateCompany.applyDiscount) {
         let discount = 0;
         let discountPercentage = 0;
         let fees = original_fees;

         discountPercentage = corporate.CorporateCompany.discount_ratio;
         discount = Math.ceil((fees * discountPercentage) / 100);

         return { discount, discountPercentage };
      } else {
         return { discount: 0, discountPercentage: 0 };
      }
   }
   async calculateDiscountForUser(request) {
      const { original_fees } = request;
      let discount = 0;
      let discountPercentage = 0;
      let fees = original_fees;

      let userDiscounts = request.userDiscounts;

      discountPercentage = Object.values(userDiscounts).reduce(
         (a, b) => a + b,
         0
      );

      discount = (fees * discountPercentage) / 100;
      fees = original_fees - discount;
      return {
         discount,
         discountPercentage,
         fees,
      };
   }
   async calculateInsuranceDiscount(car, original_fees, used_count) {
      let insuranceDiscountPercentage = 0;
      if (car.insuranceCompany) {
         if (used_count >= car.insuranceCompany.package_request_count)
            insuranceDiscountPercentage =
               car.insuranceCompany.discount_percent_after_policy_expires;
         else
            insuranceDiscountPercentage =
               car.insuranceCompany.package_discount_percentage;
         return Math.min(
            (original_fees * insuranceDiscountPercentage) / 100,
            car.insuranceCompany.max_total_discount
         );
      }
      return 0;
   }

   async calculatePromoDiscount(client, original_fees) {
      let promoPercentage = 0;
      let promoCodeId = undefined;
      let promoCodeUserId = undefined;
      let promoUseCount = undefined;
      let activePromoCodes = await PromoCodeUser.findAll({
         where: {
            UserId: client.User.id,
            active: true,
         },
      });
      if (activePromoCodes && activePromoCodes.length > 0) {
         for (let i = 0; i < activePromoCodes.length; i++) {
            let promoCode = await PromoCode.findOne({
               where: {
                  id: activePromoCodes[i].PromoCodeId,
               },
            });
            let prePomoUseCount = await ServiceRequest.count({
               where: {
                  PromoCodeUserId: activePromoCodes[i].id,
                  status: {
                     [Op.notIn]: ["canceled", "cancelWithPayment"],
                  },
               },
            });
            if (
               moment(promoCode.usageExpiryDate).isAfter(moment()) &&
               (promoCode.maxUse === 0 || prePomoUseCount < promoCode.maxUse)
            ) {
               if (promoCode.percentage > promoPercentage) {
                  promoPercentage = promoCode.percentage;
                  promoCodeId = promoCode.id;
                  promoCodeUserId = activePromoCodes[i].id;
                  promoUseCount = prePomoUseCount;
               }
            } else {
               await PromoCodeUser.update(
                  { active: false },
                  { where: { id: activePromoCodes[i].id } }
               );
            }
         }
         if (promoPercentage > 0) {
            let promoCode = activePromoCodes.find(
               (promoCode) => promoCode.PromoCodeId == promoCodeId
            );
            let promo = await PromoCode.findOne({
               where: {
                  id: promoCodeId,
               },
            });
            let updateCount = await PromoCodeUser.update(
               {
                  active:
                     promoUseCount >= promo.maxUse ||
                     moment(promo.usageExpiryDate).isBefore(moment()) ||
                     promo.voucher
                        ? false
                        : true,
               },
               {
                  where: {
                     UserId: client.User.id,
                     PromoCodeId: promoCodeId,
                  },
               }
            );

            return {
               discount: Math.floor((promoPercentage * original_fees) / 100),
               promoCodeUserId,
            };
         }
      }
      // let allUserPromoCodes = client.User.PromoCodes;
      // const promoData = allUserPromoCodes.filter(function (activePromo) {
      //   return activePromo.PromoCodeUser.active == true;
      // });
      // if (activePromoCodes && activePromoCodes.dataValues.count < promoData[0].maxUse) {
      //   if (moment(promoData[0].usageExpiryDate).isAfter(moment())) {
      //     promoPercentage = promoData[0].percentage;
      //   }
      //   let increasedCount = promoData[0].PromoCodeUser.count + 1;
      //   let updateCount = await PromoCodeUser.update(
      //     {
      //       count: increasedCount,
      //     },
      //     {
      //       where: {
      //         UserId: client.User.id,
      //         PromoCodeId: promoData[0].PromoCodeUser.PromoCodeId,
      //       },
      //     }
      //   );
      //   return Math.floor((promoPercentage * original_fees) / 100);
      // }
      return { discount: 0, promoCodeUserId: undefined };
   }

   async calculatePackageDiscount(
      clientPackage,
      original_fees,
      used_count,
      services
   ) {
      if (!clientPackage.Package.private) {
         let startDate = moment(clientPackage.startDate);
         if (startDate.isAfter(moment())) {
            return {
               discount: 0,
               discountPercentage: 0,
            };
         }
         let endDate = moment(clientPackage.endDate);
         let discount;
         if (endDate.isAfter(moment())) {
            let timeUses = services.includes(1)
               ? clientPackage.Package.numberOfDiscountTimesOther
               : clientPackage.Package.numberOfDiscountTimes;
            if (used_count >= timeUses) {
               discount =
                  (clientPackage.Package.discountAfterMaxTimes *
                     original_fees) /
                  100;
               // let checkMax = discount - original_fees;
               // discount =
               //   checkMax > clientPackage.Package.maxDiscountPerTime
               //     ? clientPackage.Package.maxDiscountPerTime - original_fees
               //     : discount;
               discount = Math.min(
                  discount,
                  clientPackage.Package.maxDiscountPerTime
                  // original_fees
               );
               return {
                  discount,
                  discountPercentage:
                     clientPackage.Package.discountAfterMaxTimes,
               };
            } else {
               discount =
                  (clientPackage.Package.discountPercentage * original_fees) /
                  100;
               // let checkMax = discount - original_fees;
               // discount =
               //   checkMax > clientPackage.Package.maxDiscountPerTime
               //     ? clientPackage.Package.maxDiscountPerTime - original_fees
               //     : discount;
               discount = Math.min(
                  discount,
                  clientPackage.Package.maxDiscountPerTime
                  // original_fees
               );
               return {
                  discount,
                  discountPercentage:
                     discount === clientPackage.Package.maxDiscountPerTime
                        ? Math.ceil((discount / original_fees) * 100)
                        : clientPackage.Package.discountPercentage,
               };
            }
         }
      } else {
         let discount = 0;
         let discountPercentage;
         let timeUses = services.includes(4)
            ? clientPackage.Package.numberOfDiscountTimes
            : clientPackage.Package.numberOfDiscountTimesOther;
         if (used_count >= timeUses) {
            discount =
               (clientPackage.Package.discountAfterMaxTimes * original_fees) /
               100;
            let checkMax = discount - original_fees;
            discount =
               checkMax > clientPackage.Package.maxDiscountPerTime
                  ? clientPackage.Package.maxDiscountPerTime - original_fees
                  : discount;
            discount = Math.min(
               discount,
               // clientPackage.Package.maxDiscountPerTime,
               original_fees
            );
            return {
               discount,
               discountPercentage: clientPackage.Package.discountAfterMaxTimes,
            };
         } else {
            discount =
               (clientPackage.Package.discountPercentage * original_fees) / 100;
            let checkMax = discount - original_fees;
            discount =
               checkMax > clientPackage.Package.maxDiscountPerTime
                  ? clientPackage.Package.maxDiscountPerTime - original_fees
                  : discount;
            discount = Math.min(
               discount,
               clientPackage.Package.maxDiscountPerTime,
               // original_fees
            );
            return {
               discount,
               discountPercentage: clientPackage.Package.discountPercentage,
            };
         }
      }
   }

   async calculateDiscountUser(original_fees, userId, carId, serviceType) {
      try {
         carId = Number(carId);
         userId = Number(userId);
         let carrier = [4, 5];
         let van = [1, 2, 3];
         let passenger = [6];

         let services = passenger;
         const isSubsetFromCarrier = serviceType?.every((element) =>
            carrier.includes(Number(element))
         );
         const isSubsetFromVan = serviceType?.every((element) =>
            van.includes(Number(element))
         );

         if (isSubsetFromCarrier) {
            services = carrier;
         }
         if (isSubsetFromVan) {
            services = van;
         }
         // * Calculate by promo
         let promoPercentage = 0;
         let promoCodeId = undefined;
         let promoDiscount;
         let pkgDiscount;
         let pkgPercentage = 0;
         let used_count = [];
         let car;
         if (carId) {
            car = await Car.findByPk(carId);
            car = car.get({ plain: true });
         }
         let activePromoCodes = await PromoCodeUser.findAll({
            where: {
               UserId: userId,
               active: true,
            },
         });
         if (activePromoCodes && activePromoCodes.length > 0) {
            for (let i = 0; i < activePromoCodes.length; i++) {
               let promoCode = await PromoCode.findOne({
                  where: {
                     id: activePromoCodes[i].PromoCodeId,
                  },
               });
               let promoUseCount = await ServiceRequest.count({
                  where: {
                     PromoCodeUserId: activePromoCodes[i].id,
                     status: {
                        [Op.notIn]: ["canceled", "cancelWithPayment"],
                     },
                  },
               });
               if (
                  moment(promoCode.usageExpiryDate).isAfter(moment()) &&
                  (promoCode.maxUse === 0 || promoUseCount < promoCode.maxUse)
               ) {
                  if (promoCode.percentage > promoPercentage) {
                     promoPercentage = promoCode.percentage;
                     promoCodeId = promoCode.id;
                  }
               } else {
                  await PromoCodeUser.update(
                     { active: false },
                     { where: { id: activePromoCodes[i].id } }
                  );
               }
            }
            if (promoPercentage > 0) {
               let promoCode = activePromoCodes.find(
                  (promoCode) => promoCode.PromoCodeId == promoCodeId
               );
               let promo = await PromoCode.findOne({
                  where: {
                     id: promoCodeId,
                  },
               });
               promoDiscount = Math.floor(
                  (promoPercentage * original_fees) / 100
               );
            }
         }
         // * Calculate by packages
         let carPackages;
         if (carId) {
            carPackages = await CarPackage.findAll({
               where: {
                  CarId: carId,
               },
               include: [
                  {
                     model: ClientPackage,
                     include: [Package],
                  },
               ],
            });
            carPackages = carPackages.map((carPackage) =>
               carPackage.get({ plain: true })
            );
            for (let i = 0; i < carPackages.length; i++) {
               if (
                  !carPackages[i].ClientPackage.Package.insuranceCompanyId &&
                  moment(carPackages[i].createdAt).add(5).isAfter(moment())
               ) {
                  continue;
               }

               if (
                  moment(carPackages[i].ClientPackage.endDate).isBefore(
                     moment()
                  )
               ) {
                  let clientPackageId = carPackages[i].ClientPackage.id;
                  await CarPackage.destroy({
                     where: {
                        ClientPackageId: clientPackageId,
                     },
                  });
                  await ClientPackage.destroy({
                     where: {
                        id: clientPackageId,
                     },
                     // cascade: true,
                  });
                  continue;
               }
               used_count = await findOldRequests(
                  carId,
                  // carPackages[i].ClientPackage.startDate,
                  // carPackages[i].ClientPackage.endDate,
                  carPackages[i].ClientPackage.id,
                  services
               );
               // if(used_count.length >= carPackages[i].ClientPackage.Package.numberOfDiscountTimes){
               //   continue;
               // }
               let currPackageDiscount = await this.calculatePackageDiscount(
                  carPackages[i].ClientPackage,
                  original_fees,
                  used_count.length,
                  services
               );

               if (currPackageDiscount.discountPercentage > pkgPercentage) {
                  pkgDiscount = currPackageDiscount.discount;
                  pkgPercentage = currPackageDiscount.discountPercentage;
                  break;
               }
            }
         }
         let discount;
         let discountPercentage;
         if (promoPercentage > 0 && pkgDiscount) {
            discount = parseInt(Math.max(promoDiscount, pkgDiscount));
            discountPercentage = parseInt(
               Math.max(promoPercentage, pkgPercentage)
            );
         } else if (promoPercentage === 0 && pkgDiscount) {
            discount = parseInt(pkgDiscount);
            discountPercentage = parseInt(pkgPercentage);
         } else if (promoPercentage > 0 && !pkgDiscount) {
            discount = parseInt(promoDiscount);
            discountPercentage = parseInt(
               Math.max(promoPercentage, pkgPercentage)
            );
         }
         return { discount, discountPercentage };
      } catch (error) {
         console.log(error);
         return new AppError(error.message, 500);
      }
   }
}

async function findOldRequests(
   carId,
   //  policy_start_date,
   //  policy_end_date,
   packageId,
   services
) {
   const oldRequests = await ServiceRequest.findAll({
      where: {
         CarId: carId,
         status: "done",
         ClientPackageId: packageId,
         //  createdAt: {
         //     [Op.between]: [policy_start_date, policy_end_date],
         //  },
      },
      include: [
         {
            model: CarServiceType,
            where: {
               id: {
                  [Op.in]: services,
               },
            },
         },
      ],
   });
   return oldRequests;
}

let discountService = new DiscountService();
module.exports = discountService;
