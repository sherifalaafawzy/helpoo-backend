const crypto = require("crypto");
const moment = require("moment");
const CorporateCompany = require("../models/CorporateCompany");
const PackagePromoCode = require("../models/PackagePromoCode");
const User = require("../models/User");
const xml2js = require("xml2js");
const AppError = require("../utils/AppError");
const userService = require("./userService");
const packageService = require("./packageService");
const UsedPromosPackages = require("../models/UsedPromosPackages");
const Package = require("../models/Package");
const { Op } = require("sequelize");
const { default: axios } = require("axios");
const corporateCompanyService = require("./CorporateCompanyService");
const CorporateDeals = require("../models/CorporateDeals");
const PackageBenefits = require("../models/PackageBenefits");

class PackagePromoCodeService {
   async getAllPromo() {
      let promos = await PackagePromoCode.findAll({
         include: [CorporateCompany],
      });
      return promos;
   }
   async getPromo(id) {
      let promo = await PackagePromoCode.findByPk(id, {
         include: [CorporateCompany],
      });
      if (!promo) return new AppError(`Promo not found`, 404);
      return promo;
   }
   async createPromo(data) {
      if (
         !data.name ||
         !data.value ||
         !data.expiryDate ||
         !data.startDate ||
         !data.usageExpiryDate
      ) {
         throw new AppError("Please provide required data", 400);
      }
      try {
         const promo = await PackagePromoCode.create(data);
         return promo;
      } catch (err) {
         console.error(err);
         throw new AppError(err.errors[0].message, 500);
      }
   }
   async updatePromo(promoId, data) {
      let promo = await PackagePromoCode.findByPk(promoId);
      if (!promo) throw new AppError("Couldn't find this promo", 404);
      await PackagePromoCode.update(data, {
         where: {
            id: promoId,
         },
      });
      promo = await PackagePromoCode.findByPk(promoId, {
         include: [CorporateCompany],
      });
      return promo;
   }
   async updateUsedPromo(useId, data) {
      let used = await UsedPromosPackages.findByPk(useId);
      if (!used) throw new AppError("Couldn't find this promo", 404);
      await UsedPromosPackages.update(data, {
         where: {
            id: useId,
         },
      });
      used = await UsedPromosPackages.findByPk(useId);
      return used;
   }
   async deletePromo(promoId) {
      let promo = await PackagePromoCode.findByPk(promoId);
      if (!promo) throw new AppError("Couldn't find this promo", 404);
      await PackagePromoCode.destroy({
         where: {
            id: promoId,
         },
      });
      return promo;
   }

   async assignPromo(promoId, userId) {
      const user = await userService.getOneUser(userId);
      if (user.statusCode) {
         return user;
      } else if (user.PackagePromoCodeId === promoId)
         throw new AppError("You are using this promo", 400);
      const promo = await PackagePromoCode.findByPk(promoId, {
         include: [CorporateCompany],
      });
      const currentDateFormatted = moment(Date.now()).format("YYYY/MM/DD");

      const currentDate = new Date(currentDateFormatted);
      const promoExpiryDate = new Date(promo.expiryDate);

      if (
         currentDate.getTime() > promoExpiryDate.getTime() ||
         (promo.count >= promo.maxCount && promo.maxCount !== 0)
      ) {
         throw new AppError("This promo has been expired", 400);
      }

      await User.update(
         {
            PackagePromoCodeId: promoId,
         },
         {
            where: {
               id: userId,
            },
         }
      );
      await PackagePromoCode.update(
         {
            count: promo.count + 1,
         },
         {
            where: {
               id: promoId,
            },
         }
      );

      return {
         ...user,
         PackagePromoCode: promo,
      };
   }

   async applyShellPromoCode(promo, amount, userId, pkgId) {
      try {
         if (!promo.startsWith("sh")) {
            return new AppError("This promo is not for shell", 400);
         }
         let cardholderId = promo.split("-")[1];
         const res = await axios.post(
            "http://tablet.e-points.net/EpointsWebIntegrationService/EpointsWebIntegrationService/RewardingAction",
            {
               Amount: amount,
               CardholderId: cardholderId,
               InvoiceNo: `HS-${userId}`,
               StationID: "3146958401",
               CountryID: 12,
               Token: "u2OiISaCngHcH5BB5vp0ax6qQeQhf2O5RJc6tWi/U0O1fpXIjw3bLh89UFNAtz46v3QX08P8zX5aD0uzF7hLScYDBKNBgGPp",
            }
         );
         const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: true,
         });
         let data;
         parser.parseString(res.data, (error, result) => {
            if (error) {
               console.error("Error parsing XML:", error);
            } else {
               console.log("Parsed XML:", result);
               data = result.RewardActionOutput;
               // Access the parsed XML data here
               // For example, if you have <element>Value</element> in your XML, you can access it as result.root.element
            }
         });
         let dataa = data.ActionHTML.split("-");
         let promoCode = await PackagePromoCode.findOne({
            where: { value: promo },
         });
         if (!promoCode) {
            let message = `تم تطبيق خصم ع الباقة برعاية Shell بقيمة ${
               100 - Math.ceil((Math.ceil(dataa[0]) / amount) * 100)
            }%`;
            let corp = await CorporateCompany.findOne({
               where: {
                  en_name: {
                     [Op.iLike]: "shell",
                  },
               },
            });
            promoCode = await this.createPromo({
               name: "shell",
               value: promo,
               expiryDate: moment().add(10, "days"),
               startDate: moment().subtract(10, "days"),
               usageExpiryDate: moment().add(10, "days"),
               maxCount: 1,
               count: 0,
               maxUse: 1,
               percentage:
                  100 - Math.ceil((Math.ceil(dataa[0]) / amount) * 100),
               private: true,
               SMS: message,
               CorporateCompanyId: corp ? corp.id : null,
            });
            if (promoCode.statusCode) {
               if (promoCode.message.includes("value")) {
                  return new AppError("this promo has been used before", 400);
               }
               return new AppError(promoCode.message, promoCode.statusCode);
            }
         }
         let use = await this.usePromoCodeInPackage({
            packageId: pkgId,
            userId,
            promoId: promoCode.id,
            transactionsIds: `${dataa[1]}/HS-${userId}`,
         });
         if (use.statusCode) {
            return new AppError(use.message, use.statusCode);
         }
         return {
            amount: Math.ceil(dataa[0]),
            transactionId: dataa[1],
         };
      } catch (err) {
         return err.response.data;
      }
   }

   async usePromoCodeInPackage({
      packageId,
      userId,
      promoId,
      transactionsIds,
   }) {
      const user = await userService.getOneUser(userId);
      if (user.statusCode) {
         return user;
      }
      const pkg = await packageService.getOnePackage(packageId);
      if (pkg.statusCode) {
         return pkg;
      }
      let promo = await this.getPromo(promoId);
      if (promo.statusCode) {
         return promo;
      }

      const checkIfUsed = await UsedPromosPackages.findOne({
         where: {
            PackagePromoCodeId: promoId,
            UserId: userId,
            PackageId: packageId,
            ClientPackageId: {
               [Op.ne]: null,
            },
         },
      });
      const currentDateFormatted = moment(Date.now()).format("YYYY/MM/DD");

      const currentDate = new Date(currentDateFormatted);
      const promoExpiryDate = new Date(promo.expiryDate);
      const promoUsageExpiryDate = new Date(promo.expiryDate);

      if (checkIfUsed) {
         return new AppError("This promo has already been used", 400);
      }
      if (!checkIfUsed) {
         let getCount = await UsedPromosPackages.count({
            where: {
               PackagePromoCodeId: promoId,
               UserId: userId,
               ClientPackageId: {
                  [Op.eq]: null,
               },
            },
         });
         await UsedPromosPackages.destroy({
            where: {
               PackagePromoCodeId: promoId,
               UserId: userId,
               ClientPackageId: {
                  [Op.eq]: null,
               },
            },
         });
         await PackagePromoCode.update(
            {
               count: promo.count - getCount,
            },
            {
               where: {
                  id: promoId,
               },
            }
         );
      }
      let useTimes = await UsedPromosPackages.count({
         where: {
            PackagePromoCodeId: promoId,
            UserId: userId,
         },
      });
      if (promo.maxUse !== 0 && useTimes >= promo.maxUse) {
         return new AppError(
            "This promo has already been used and reached max count",
            400
         );
      }
      promo = await this.getPromo(promoId);
      if (
         currentDate.getTime() > promoExpiryDate.getTime() ||
         currentDate.getTime() > promoUsageExpiryDate.getTime() ||
         (promo.count >= promo.maxCount && promo.maxCount !== 0)
      ) {
         return new AppError("This promo has been expired", 400);
      }

      const fees =
         pkg.fees -
         (promo.percentage
            ? (pkg.fees * promo.percentage) / 100
            : promo.feesDiscount);
      let newUse = await UsedPromosPackages.create({
         UserId: userId,
         PackageId: packageId,
         PackagePromoCodeId: promoId,
         fees,
         transactionsIds,
      });
      await PackagePromoCode.update(
         {
            count: promo.count + 1,
         },
         {
            where: {
               id: promoId,
            },
         }
      );
      newUse = newUse.get({ plain: true });
      return newUse;
   }
   async getUsedPromos(userId) {}
   async generateAndAddPromo(corporateName, percentage, corp, feesDiscount) {
      //    let value = crypto.randomBytes(4).toString("hex");
      //    let doesExist = await PackagePromoCode.findOne({
      //       where: {
      //          value,
      //       },
      //    });
      //    while (doesExist) {
      //       value = crypto.randomBytes(4).toString("hex");
      //       doesExist = await PackagePromoCode.findOne({
      //          where: {
      //             value,
      //          },
      //       });
      //    }
      let value = `${Date.now()}-${corporateName}`;
      const newPromo = await this.createPromo({
         name: corporateName,
         value: value,
         expiryDate: moment().add(10, "days"),
         startDate: moment().subtract(10, "days"),
         usageExpiryDate: moment().add(10, "days"),
         maxCount: 1,
         count: 0,
         maxUse: 1,
         percentage: percentage,
         feesDiscount,
         private: true,
         CorporateCompanyId: corp ? corp.id : null,
      });
      return newPromo;
   }
   async getUsedPromoWithFilters({ pkgId, userId, promoId }) {
      let where = {};

      if (pkgId) {
         where["PackageId"] = pkgId;
      }
      if (userId) {
         where["UserId"] = userId;
      }
      if (promoId) {
         where["PackagePromoCodeId"] = promoId;
      }

      const uses = await UsedPromosPackages.findAll({
         where: where,
         include: [
            User,
            { model: PackagePromoCode, include: [CorporateCompany] },
            Package,
         ],
      });
      return uses;
   }

   async findPromoAndValidate(value, userId) {
      let promo = await PackagePromoCode.findOne({
         where: {
            value,
         },
      });
      if (!promo) return new AppError(`Promo not found`, 404);
      let user = await userService.findUserWithId(userId);
      if (!user) return new AppError(`User not found`, 404);

      const currentDateFormatted = moment(Date.now()).format("YYYY/MM/DD");

      const currentDate = new Date(currentDateFormatted);
      const promoExpiryDate = new Date(promo.expiryDate);
      const promoUsageExpiryDate = new Date(promo.expiryDate);
      let useTimes = await UsedPromosPackages.count({
         where: {
            PackagePromoCodeId: promo.id,
            UserId: userId,
         },
      });
      if (promo.maxUse !== 0 && useTimes >= promo.maxUse) {
         return new AppError(
            "This promo has already been used and reached max count",
            400
         );
      }
      // promo = await this.getPromo(promo.id);
      if (
         currentDate.getTime() > promoExpiryDate.getTime() ||
         currentDate.getTime() > promoUsageExpiryDate.getTime() ||
         (promo.count >= promo.maxCount && promo.maxCount !== 0)
      ) {
         return new AppError("This promo has been expired", 400);
      }
      return [promo];
   }

   async getPromoWithFilters({ corporateCompanyId, value, name }) {
      let where = {};
      if (value) {
         where["value"] = value;
      }
      if (corporateCompanyId) {
         where["CorporateCompanyId"] = corporateCompanyId;
      }
      if (name) {
         where["name"] = name;
      }

      const promos = await PackagePromoCode.findAll({
         where: where,
         include: [CorporateCompany],
      });
      return promos;
   }
   async getUsedPromoForUserAndPackage(userId, pkgId) {
      let usedPromo = await UsedPromosPackages.findAll({
         order: [["id", "DESC"]],
         where: {
            UserId: userId,
            PackageId: pkgId,
         },
         include: [PackagePromoCode],
      });
      usedPromo = usedPromo[0];
      if (usedPromo) {
         usedPromo = usedPromo.get({ plain: true });
      }
      return usedPromo;
   }
   async getPackagesWithCorporateName(corporateName) {
      let corporateCompany = await corporateCompanyService.searchByName(
         corporateName
      );
      if (!corporateCompany[0]) {
         return new AppError("Couldn't find this corporate", 400);
      }
      let deals = await CorporateDeals.findAll({
         where: {
            CorporateCompanyId: corporateCompany[0].id,
         },
         include: [
            {
               model: Package,
               include: [
                  {
                     model: PackageBenefits,
                     order: [["id", "ASC"]],
                  },
               ],
            },
         ],
      });
      deals.forEach((deal) => {
         deal.Package.PackageBenefits.sort((a, b) => {
            // Replace 'fieldName' with the actual field you want to sort by
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
         });
      });
      return { corporateCompany: corporateCompany[0], deals };
   }
   async usePromoWithCorporateName(userId, pkgId, corporateName, dealId) {
      let corporateCompany = await corporateCompanyService.searchByName(
         corporateName
      );
      if (!corporateCompany[0]) {
         return new AppError("Couldn't find this corporate", 400);
      }
      let deal = await CorporateDeals.findOne({
         where: {
            id: dealId,
            CorporateCompanyId: corporateCompany[0].id,
            PackageId: pkgId,
         },
         include: [Package],
      });
      if (!deal) {
         return new AppError(
            "This package is not in our deal with this corporate",
            400
         );
      }
      if (moment().isAfter(moment(deal.expiryDate))) {
         return new AppError("This deal has been expired", 400);
      }
      let discount;
      let discountPercentage;
      if (deal.discountPercent) {
         discountPercentage = deal.discountPercent;
         discount = Math.round(
            (deal.discountPercent / 100) * deal.Package.fees
         );
      }
      if (deal.discountFees) {
         discountPercentage = Math.ceil(
            (deal.discountFees / deal.Package.fees) * 100
         );
         discount = deal.discountFees;
      }
      let promo = await this.generateAndAddPromo(
         corporateName,
         deal.discountFees ? 0 : discountPercentage,
         corporateCompany[0],
         discount
      );
      let use = await this.usePromoCodeInPackage({
         packageId: pkgId,
         userId,
         promoId: promo.id,
      });
      if (use.statusCode) {
         return new AppError(use.message, use.statusCode);
      }
      return use;
   }
   async isExist(value) {
      const promo = await PackagePromoCode.findOne({
         where: {
            value,
         },
      });
      if (!promo) return false;
      else return true;
   }

   async createDeal(
      discountPercent,
      discountFees,
      PackageId,
      CorporateCompanyId,
      expiryDate
   ) {
      try {
         if (!(discountPercent ^ discountFees))
            return new AppError(
               "You must provide discount precent or fees , not both",
               400
            );
         if (!PackageId)
            return new AppError("Please provide a PackageId.", 400);
         if (!expiryDate)
            return new AppError("Please provide a expiry date.", 400);
         if (moment().isAfter(moment(expiryDate)))
            return new AppError("Please provide a valid expiry date", 400);
         let checkIfExists = await CorporateDeals.findOne({
            where: {
               CorporateCompanyId,
               PackageId,
            },
         });
         if (
            checkIfExists &&
            moment().isBefore(moment(checkIfExists.expiryDate))
         ) {
            return new AppError("This deal has been already added", 400);
         }
         let deal = await CorporateDeals.create({
            discountPercent,
            discountFees,
            PackageId,
            CorporateCompanyId,
            expiryDate,
         });
         return deal;
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }

   async getAllDeals(page = 1, size = 10) {
      let deals = await CorporateDeals.findAll({
         limit: size,
         offset: (page - 1) * size,
         include: [
            {
               model: Package,
            },
            {
               model: CorporateCompany,
            },
         ],
      });
      return deals;
   }
}

const packagePromoCodeService = new PackagePromoCodeService();
module.exports = packagePromoCodeService;
