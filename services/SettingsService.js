// NPM Lib
const { Op } = require("sequelize");
const axios = require("axios");
const sequelize = require("sequelize");
const moment = require("moment");

// Models
const Settings = require("../models/Settings");
const Wizard = require("../models/Wizard");
const ServiceRequest = require("../models/ServiceRequest");
const AccidentReport = require("../models/AccidentReport");
const Client = require("../models/Client");
const Targets = require("../models/Targets");
const User = require("../models/User");
const Role = require("../models/Roles");
const CorporateCompany = require("../models/CorporateCompany");
const Config = require("../models/Config");
const ClientPackages = require("../models/ClientPackage");
const PackageTransactions = require("../models/PackageTransactions");
const PackagePromoCode = require("../models/PackagePromoCode");
const UsedPromosPackages = require("../models/UsedPromosPackages");
const PromoCode = require("../models/PromoCode");
const PromoCodeUser = require("../models/PromoCodeUser");
// Utils
const rolesEnum = require("../enums/Roles");
const AppError = require("../utils/AppError");

class SettingsService {
   async createConfig(data) {
      try {
         let config = await Config.create(data);
         return config;
      } catch (err) {
         return new AppError(err.message, 500);
      }
   }
   async updateConfig(id, data) {
      let check = await Config.findByPk(id);
      if (!check) return new AppError("Not Found", 404);
      await Config.update(data, {
         where: {
            id,
         },
      });
      let config = await Config.findByPk(id);
      return config;
   }
   async getAllConfig() {
      let configs = await Config.findAll();
      return configs;
   }
   async getSettings() {
      return await Settings.findOne({
         where: {
            id: 1,
         },
      });
   }

   async updateSettings(settings) {
      let setting = await this.getSettings();
      if (!setting) {
         setting = await Settings.create(settings);
         return setting;
      }
      return await Settings.update(settings, {
         where: {
            id: 1,
         },
      });
   }
   async createWizard(wizard) {
      try {
         let ts = Date.now();
         let img = decodeImages(`${wizard.name}-${ts}`, wizard.img);
         const newWizard = await Wizard.create({
            ...wizard,
            img,
         });
         return newWizard;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async getWizards() {
      return await Wizard.findAll();
   }
   async getWizardByName(name) {
      const wizard = await Wizard.findOne({
         where: {
            name,
         },
      });
      if (!wizard) return new AppError("No wizard with this name", 404);
      return wizard;
   }
   async getWizardById(id) {
      const wizard = await Wizard.findOne({
         where: {
            id,
         },
      });
      if (!wizard) return new AppError("No wizard with this name", 404);
      return wizard;
   }
   async updateWizard(wizard, id) {
      let checkExist = await Wizard.findByPk(id);
      if (!checkExist) return new AppError("No wizard with this name", 404);
      return await Wizard.update(wizard, {
         where: {
            id,
         },
      });
   }
   async deleteWizard(id) {
      let checkExist = await Wizard.findByPk(id);
      if (!checkExist) return new AppError("No wizard with this name", 404);
      return await Wizard.destroy({
         where: {
            id,
         },
      });
   }
   async getStats() {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const formattedMonthStart = `${year}-${month}-${1}`;
      const formattedLastMonth = `${date.getMonth() === 0 ? year - 1 : year}-${
         date.getMonth() === 0 ? 12 : month - 1
      }-${1}`;
      const formattedDay = `${year}-${month}-${day}`;
      const lastMonth = date.getMonth() === 0 ? 12 : month - 1;
      const formattedLastDayLastMonth = `${
         date.getMonth() === 0 ? year - 1 : year
      }-${lastMonth}-${getMonthLastDay(lastMonth, year)}`;
      const monthName = date.toLocaleString("default", { month: "long" });
      const getTimeStampForCurrent = new Date(formattedMonthStart).getTime();
      const getTimeStampForToday = new Date(formattedDay).getTime();
      const getTimeStampForLast = new Date(formattedLastMonth).getTime();

      try {
         let totalSubscribers = await ClientPackages.count();
         let thisMonthSubscribers = await ClientPackages.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
            },
         });
         // let incomeOfPackages = await
         let totalPackageIncome = await PackageTransactions.findOne({
            attributes: [
               [sequelize.literal(`SUM("transactionAmount")`), "totalFees"],
            ],
            raw: true, // Ensure raw query results without model instance
            where: {
               transactionStatus: "paid",
            },
         });
         let packageIncomeThisMonth = await PackageTransactions.findOne({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
               transactionStatus: "paid",
            },
            attributes: [
               [sequelize.literal(`SUM("transactionAmount")`), "totalFees"],
            ],
            raw: true, // Ensure raw query results without model instance
         });

         let todaySR = await ServiceRequest.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForToday,
               },
            },
         });
         let serviceRequestCount = await ServiceRequest.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
               status: "done",
            },
         });
         let oldServiceRequestCount = await ServiceRequest.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForLast,
                  [Op.lt]: getTimeStampForCurrent,
               },
               status: "done",
            },
         });
         let clientsForToday = await Client.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForToday,
               },
            },
         });
         let clientsForMonth = await Client.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
            },
         });

         // let corporateCount = await CorporateCompany.count();
         let FNOLCount = await AccidentReport.count();
         let thisMonthTarget = await Targets.findOne({
            where: {
               month: monthName,
               year,
            },
         });

         const canceledRequestsThisMonth = await ServiceRequest.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
               status: {
                  [Op.in]: ["canceled", "canceledWithPayment"],
               },
            },
         });
         const canceledRequestsLastMonth = await ServiceRequest.count({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForLast,
                  [Op.lt]: getTimeStampForCurrent,
               },
               status: {
                  [Op.in]: ["canceled", "canceledWithPayment"],
               },
            },
         });
         const thisMonth = await ServiceRequest.findAll({
            attributes: [
               [sequelize.fn("SUM", sequelize.col("fees")), "thisMonthRevenue"],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = '${rolesEnum.Client}' THEN 1 ELSE NULL END`
                     )
                  ),
                  "thisMonthAppRequests",
               ],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = '${rolesEnum.Corporate}' OR "ServiceRequest"."CorporateCompanyId" IS NOT NULL THEN 1 ELSE NULL END`
                     )
                  ),
                  "thisMonthCorporateRequests",
               ],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = 'CallCenter' THEN 1 ELSE NULL END`
                     )
                  ),
                  "thisMonthCallCenterRequests",
               ],
            ],
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
               status: "done",
            },
            include: [
               {
                  model: User,
                  include: [Role],
               },
            ],
            group: ["ServiceRequest.id", "User.id", "User->Role.id"], // Include the necessary fields in the GROUP BY clause

            raw: true, // Ensure raw query results without model instance
         });
         const thisMonthRevenue = thisMonth.reduce(
            (sum, row) => sum + parseFloat(row.thisMonthRevenue || 0),
            0
         );
         const thisMonthAppRequests = thisMonth.reduce(
            (sum, row) => sum + parseInt(row.thisMonthAppRequests || 0),
            0
         );
         const thisMonthCorporateRequests = thisMonth.reduce(
            (sum, row) => sum + parseInt(row.thisMonthCorporateRequests || 0),
            0
         );
         const thisMonthCallCenterRequests = thisMonth.reduce(
            (sum, row) => sum + parseInt(row.thisMonthCallCenterRequests || 0),
            0
         );
         const lastMonth = await ServiceRequest.findAll({
            attributes: [
               [sequelize.fn("SUM", sequelize.col("fees")), "lastMonthRevenue"],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = '${rolesEnum.Client}' THEN 1 ELSE NULL END`
                     )
                  ),
                  "lastMonthAppRequests",
               ],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = '${rolesEnum.Corporate}' OR "ServiceRequest"."CorporateCompanyId" IS NOT NULL THEN 1 ELSE NULL END`
                     )
                  ),
                  "lastMonthCorporateRequests",
               ],
               [
                  sequelize.fn(
                     "COUNT",
                     sequelize.literal(
                        `CASE WHEN "User->Role".name = 'CallCenter' THEN 1 ELSE NULL END`
                     )
                  ),
                  "lastMonthCallCenterRequests",
               ],
            ],
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForLast,
                  [Op.lt]: getTimeStampForCurrent,
               },
               status: "done",
            },
            include: [
               {
                  model: User,
                  include: [Role],
               },
            ],
            group: ["ServiceRequest.id", "User.id", "User->Role.id"], // Include the necessary fields in the GROUP BY clause

            raw: true, // Ensure raw query results without model instance
         });

         const lastMonthRevenue = lastMonth.reduce(
            (sum, row) => sum + parseFloat(row.lastMonthRevenue || 0),
            0
         );
         const lastMonthAppRequests = lastMonth.reduce(
            (sum, row) => sum + parseInt(row.lastMonthAppRequests || 0),
            0
         );
         const lastMonthCorporateRequests = lastMonth.reduce(
            (sum, row) => sum + parseInt(row.lastMonthCorporateRequests || 0),
            0
         );
         const lastMonthCallCenterRequests = lastMonth.reduce(
            (sum, row) => sum + parseInt(row.lastMonthCallCenterRequests || 0),
            0
         );
         let topThreeCorp = await CorporateCompany.findAll({
            include: [
               {
                  model: ServiceRequest,
                  attributes: [],
                  where: {
                     status: "done",
                  },
               },
            ],
            attributes: [
               "id",
               "en_name",
               "ar_name",
               [
                  sequelize.literal(
                     `(SELECT COUNT(*) FROM "ServiceRequests" WHERE "ServiceRequests"."CorporateCompanyId" = "CorporateCompany"."id" AND "ServiceRequests"."createdAt" >= '${
                        formattedLastDayLastMonth + " 00:00:00.000 +00:00"
                     }')`
                  ),
                  "numofrequeststhismonth",
               ],
            ],
            group: ["CorporateCompany.id"],
            order: [[sequelize.literal("numofrequeststhismonth"), "DESC"]],
            limit: 3,
         });
         topThreeCorp = topThreeCorp.map((corp) => corp.get({ plain: true }));

         let data = {
            thisMonthServiceRequests: serviceRequestCount,
            thisMonthRevenue,
            lastMonthServiceRequests: oldServiceRequestCount,
            lastMonthRevenue,
            thisMonthTarget: thisMonthTarget ? thisMonthTarget.target : 0,
            achievedTargetPercent: thisMonthTarget
               ? (thisMonthRevenue / thisMonthTarget.target) * 100
               : 0,
            requestsForToday: todaySR,
            registrationToday: clientsForToday,
            registrationThisMonth: clientsForMonth,
            FNOLCreated: FNOLCount,
            canceledRequestsThisMonth,
            canceledRequestsLastMonth,
            thisMonthAppRequests,
            thisMonthCallCenterRequests,
            thisMonthCorporateRequests,
            lastMonthAppRequests,
            lastMonthCallCenterRequests,
            lastMonthCorporateRequests,
            totalSubscribers,
            thisMonthSubscribers,
            totalPackageIncome,
            packageIncomeThisMonth,
            mostCorporate: {
               en_name: topThreeCorp[0] ? topThreeCorp[0].en_name : "",
               ar_name: topThreeCorp[0] ? topThreeCorp[0].ar_name : "",
               id: topThreeCorp[0] ? topThreeCorp[0].id : 0,
            },
            mostCorporateCount: topThreeCorp[0]
               ? topThreeCorp[0].numofrequeststhismonth
               : 0,
            secondCorporate: {
               en_name: topThreeCorp[1] ? topThreeCorp[1].en_name : "",
               ar_name: topThreeCorp[1] ? topThreeCorp[1].ar_name : "",
               id: topThreeCorp[1] ? topThreeCorp[1].id : 0,
            },
            secondCorporateCount: topThreeCorp[1]
               ? topThreeCorp[1].numofrequeststhismonth
               : 0,
            thirdCorporate: {
               en_name: topThreeCorp[2] ? topThreeCorp[2].en_name : "",
               ar_name: topThreeCorp[2] ? topThreeCorp[2].ar_name : "",
               id: topThreeCorp[2] ? topThreeCorp[2].id : 0,
            },
            thirdCorporateCount: topThreeCorp[2]
               ? topThreeCorp[2].numofrequeststhismonth
               : 0,
         };
         return data;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 500);
      }
   }

   async getStatsWithDates(sDate, eDate) {
      let startDate = new Date(sDate);
      let endDate = eDate
         ? new Date(eDate)
         : new Date(moment(startDate).add(2, "months"));
      let totalSubscribers = await ClientPackages.count();
      let thisMonthSubscribers = await ClientPackages.count({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
         },
      });
      // let incomeOfPackages = await
      let totalPackageIncome = await PackageTransactions.findOne({
         attributes: [
            [sequelize.literal(`SUM("transactionAmount")`), "totalFees"],
         ],
         raw: true, // Ensure raw query results without model instance
         where: {
            transactionStatus: "paid",
         },
      });

      let packageIncomeThisMonth = await PackageTransactions.findOne({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
            transactionStatus: "paid",
         },
         attributes: [
            [sequelize.literal(`SUM("transactionAmount")`), "totalFees"],
         ],
         raw: true, // Ensure raw query results without model instance
      });

      let todaySR = await ServiceRequest.count({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
         },
      });
      let serviceRequestCount = await ServiceRequest.count({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
            status: "done",
         },
      });

      let clientsForMonth = await Client.count({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
         },
      });

      // let corporateCount = await CorporateCompany.count();
      let FNOLCount = await AccidentReport.count();
      // let thisMonthTarget = await Targets.findOne({
      //    where: {
      //       month: monthName,
      //       year,
      //    },
      // });

      const canceledRequestsThisMonth = await ServiceRequest.count({
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
            status: {
               [Op.in]: ["canceled", "canceledWithPayment"],
            },
         },
      });

      const thisMonth = await ServiceRequest.findAll({
         attributes: [
            [sequelize.fn("SUM", sequelize.col("fees")), "thisMonthRevenue"],
            [
               sequelize.fn(
                  "COUNT",
                  sequelize.literal(
                     `CASE WHEN "User->Role".name = '${rolesEnum.Client}' THEN 1 ELSE NULL END`
                  )
               ),
               "thisMonthAppRequests",
            ],
            [
               sequelize.fn(
                  "COUNT",
                  sequelize.literal(
                     `CASE WHEN "User->Role".name = '${rolesEnum.Corporate}' OR "ServiceRequest"."CorporateCompanyId" IS NOT NULL THEN 1 ELSE NULL END`
                  )
               ),
               "thisMonthCorporateRequests",
            ],
            [
               sequelize.fn(
                  "COUNT",
                  sequelize.literal(
                     `CASE WHEN "User->Role".name = 'CallCenter' THEN 1 ELSE NULL END`
                  )
               ),
               "thisMonthCallCenterRequests",
            ],
         ],
         where: {
            createdAt: {
               [Op.gte]: startDate.getTime(),
               [Op.lte]: endDate.getTime(),
            },
            status: "done",
         },
         include: [
            {
               model: User,
               include: [Role],
            },
         ],
         group: ["ServiceRequest.id", "User.id", "User->Role.id"], // Include the necessary fields in the GROUP BY clause

         raw: true, // Ensure raw query results without model instance
      });
      const parsedData = thisMonth.map((row) => ({
         thisMonthRevenue: parseFloat(row.thisMonthRevenue || 0),
         thisMonthAppRequests: parseInt(row.thisMonthAppRequests || 0),
         thisMonthCorporateRequests: parseInt(
            row.thisMonthCorporateRequests || 0
         ),
         thisMonthCallCenterRequests: parseInt(
            row.thisMonthCallCenterRequests || 0
         ),
      }));
      const thisMonthRevenue = parsedData.reduce(
         (sum, row) => sum + parseFloat(row.thisMonthRevenue || 0),
         0
      );
      const thisMonthAppRequests = parsedData.reduce(
         (sum, row) => sum + parseInt(row.thisMonthAppRequests || 0),
         0
      );
      const thisMonthCorporateRequests = parsedData.reduce(
         (sum, row) => sum + parseInt(row.thisMonthCorporateRequests || 0),
         0
      );
      const thisMonthCallCenterRequests = parsedData.reduce(
         (sum, row) => sum + parseInt(row.thisMonthCallCenterRequests || 0),
         0
      );

      try {
         let topThreeCorp = await CorporateCompany.findAll({
            include: [
               {
                  model: ServiceRequest,
                  attributes: [],
                  where: {
                     status: "done",
                  },
               },
            ],
            attributes: [
               "id",
               "en_name",
               "ar_name",
               [
                  sequelize.literal(
                     `(SELECT COUNT(*) FROM "ServiceRequests" WHERE "ServiceRequests"."CorporateCompanyId" = "CorporateCompany"."id" AND "ServiceRequests"."createdAt" >= '${
                        moment(startDate).format("YYYY-MM-DD") +
                        " 00:00:00.000 +00:00"
                     }' AND "ServiceRequests"."createdAt" <= '${
                        moment(endDate).format("YYYY-MM-DD") +
                        " 00:00:00.000 +00:00"
                     }')`
                  ),
                  "numofrequeststhismonth",
               ],
            ],
            group: ["CorporateCompany.id"],
            order: [[sequelize.literal("numofrequeststhismonth"), "DESC"]],
            limit: 3,
         });
         topThreeCorp = topThreeCorp.map((corp) => corp.get({ plain: true }));

         let data = {
            thisMonthServiceRequests: serviceRequestCount,
            thisMonthRevenue,
            requestsForToday: todaySR,
            canceledRequestsThisMonth,
            registrationThisMonth: clientsForMonth,
            FNOLCreated: FNOLCount,
            thisMonthAppRequests,
            thisMonthCallCenterRequests,
            thisMonthCorporateRequests,
            totalSubscribers,
            thisMonthSubscribers,
            totalPackageIncome,
            packageIncomeThisMonth,
            mostCorporate: {
               en_name: topThreeCorp[0] ? topThreeCorp[0].en_name : "",
               ar_name: topThreeCorp[0] ? topThreeCorp[0].ar_name : "",
               id: topThreeCorp[0] ? topThreeCorp[0].id : 0,
            },
            mostCorporateCount: topThreeCorp[0]
               ? topThreeCorp[0].numofrequeststhismonth
               : 0,
            secondCorporate: {
               en_name: topThreeCorp[1] ? topThreeCorp[1].en_name : "",
               ar_name: topThreeCorp[1] ? topThreeCorp[1].ar_name : "",
               id: topThreeCorp[1] ? topThreeCorp[1].id : 0,
            },
            secondCorporateCount: topThreeCorp[1]
               ? topThreeCorp[1].numofrequeststhismonth
               : 0,
            thirdCorporate: {
               en_name: topThreeCorp[2] ? topThreeCorp[2].en_name : "",
               ar_name: topThreeCorp[2] ? topThreeCorp[2].ar_name : "",
               id: topThreeCorp[2] ? topThreeCorp[2].id : 0,
            },
            thirdCorporateCount: topThreeCorp[2]
               ? topThreeCorp[2].numofrequeststhismonth
               : 0,
         };
         return data;
      } catch (err) {
         console.log(err);
      }
      return {
         message: "Stats",
      };
   }
   async promoStats() {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const formattedMonthStart = `${year}-${month}-${1}`;
      const getTimeStampForCurrent = new Date(formattedMonthStart).getTime();
      try {
         // Query the names of promo codes
         const promoCodes = await PromoCode.findAll({
            attributes: ["name", "id"],
            raw: true,
         });

         // Query the sum of usage for each promo code
         const usageCounts = await PromoCodeUser.findAll({
            attributes: [
               "PromoCodeId",
               [
                  sequelize.fn("COUNT", sequelize.col("PromoCodeId")),
                  "usageCount",
               ],
            ],
            group: ["PromoCodeId"],
            raw: true,
         });

         // Create a map to store the usage counts by promo code ID
         const usageMap = new Map();
         usageCounts.forEach((usage) => {
            usageMap.set(usage.PromoCodeId, usage.usageCount);
         });
         // Combine the promo code names and usage counts
         let allPromoCodesUsage = promoCodes.map((promoCode) => ({
            name: promoCode.name,
            usageCount: usageMap.get(promoCode.id) || 0, // Get the usage count from the map or default to 0 if not found
         }));
         allPromoCodesUsage.sort((a, b) => b.usageCount - a.usageCount);

         const usageCountsThisMonth = await PromoCodeUser.findAll({
            where: {
               createdAt: {
                  [Op.gte]: getTimeStampForCurrent,
               },
            },
            attributes: [
               "PromoCodeId",
               [
                  sequelize.fn("COUNT", sequelize.col("PromoCodeId")),
                  "usageCount",
               ],
            ],
            group: ["PromoCodeId"],
            raw: true,
         });

         const usageMapOther = new Map();
         usageCountsThisMonth.forEach((usage) => {
            usageMapOther.set(usage.PromoCodeId, usage.usageCount);
         });
         // Combine the promo code names and usage counts
         let promoCodesUsageThisMonth = promoCodes.map((promoCode) => ({
            name: promoCode.name,
            usageCount: usageMapOther.get(promoCode.id) || 0, // Get the usage count from the map or default to 0 if not found
         }));
         promoCodesUsageThisMonth = promoCodesUsageThisMonth.filter(
            (promoCode) => {
               // console.log(promoCode);
               if (promoCode.usageCount == 0) {
                  return false;
               }
               return true;
            }
         );
         promoCodesUsageThisMonth.sort((a, b) => b.usageCount - a.usageCount);

         // Fetch all PackagePromoCodes along with their corresponding CorporateCompany
         const promoCodePackage = await PackagePromoCode.findAll({
            include: [{ model: CorporateCompany }],
            where: {
               CorporateCompanyId: {
                  [Op.ne]: null,
               },
            },
         });

         const promoUsageByCorporate = {};

         // Iterate through each promo code
         for (const promoCode of promoCodePackage) {
            const { CorporateCompany: corporate, name } = promoCode;
            // Fetch usage count for the current promo code
            let usageCountPP = await UsedPromosPackages.count({
               where: {
                  PackagePromoCodeId: promoCode.id,
                  ClientPackageId: {
                     [Op.ne]: null,
                  },
                  createdAt: {
                     [Op.gte]: getTimeStampForCurrent,
                  },
               },
            });
            if (promoUsageByCorporate[corporate.en_name]) {
               promoUsageByCorporate[corporate.en_name] += usageCountPP;
               continue;
            }
            promoUsageByCorporate[corporate.en_name] = usageCountPP;
         }
         // console.log(promoUsageByCorporate);

         return { promoUsageByCorporate, promoCodesUsageThisMonth };
      } catch (error) {
         console.error(
            "Error retrieving promo code usage by corporate:",
            error
         );
         throw error;
      }
   }
   async promoStatsWithDates(sDate, eDate) {
      let startDate = new Date(sDate);
      let endDate = eDate
         ? new Date(eDate)
         : new Date(moment(startDate).add(2, "months"));
      try {
         // Query the names of promo codes
         const promoCodes = await PromoCode.findAll({
            attributes: ["name", "id"],
            raw: true,
         });

         // Query the sum of usage for each promo code
         const usageCounts = await PromoCodeUser.findAll({
            attributes: [
               "PromoCodeId",
               [
                  sequelize.fn("COUNT", sequelize.col("PromoCodeId")),
                  "usageCount",
               ],
            ],
            group: ["PromoCodeId"],
            raw: true,
            where: {
               createdAt: {
                  [Op.gte]: startDate.getTime(),
                  [Op.lte]: endDate.getTime(),
               },
            },
         });

         // Create a map to store the usage counts by promo code ID
         const usageMap = new Map();
         usageCounts.forEach((usage) => {
            usageMap.set(usage.PromoCodeId, usage.usageCount);
         });
         // Combine the promo code names and usage counts
         let allPromoCodesUsage = promoCodes.map((promoCode) => ({
            name: promoCode.name,
            usageCount: usageMap.get(promoCode.id) || 0, // Get the usage count from the map or default to 0 if not found
         }));
         allPromoCodesUsage.sort((a, b) => b.usageCount - a.usageCount);

         const usageCountsThisMonth = await PromoCodeUser.findAll({
            where: {
               createdAt: {
                  [Op.gte]: startDate.getTime(),
                  [Op.lte]: endDate.getTime(),
               },
            },
            attributes: [
               "PromoCodeId",
               [
                  sequelize.fn("COUNT", sequelize.col("PromoCodeId")),
                  "usageCount",
               ],
            ],
            group: ["PromoCodeId"],
            raw: true,
         });

         const usageMapOther = new Map();
         usageCountsThisMonth.forEach((usage) => {
            usageMapOther.set(usage.PromoCodeId, usage.usageCount);
         });
         // Combine the promo code names and usage counts
         let promoCodesUsageThisMonth = promoCodes.map((promoCode) => ({
            name: promoCode.name,
            usageCount: usageMapOther.get(promoCode.id) || 0, // Get the usage count from the map or default to 0 if not found
         }));
         promoCodesUsageThisMonth = promoCodesUsageThisMonth.filter(
            (promoCode) => {
               // console.log(promoCode);
               if (promoCode.usageCount == 0) {
                  return false;
               }
               return true;
            }
         );
         promoCodesUsageThisMonth.sort((a, b) => b.usageCount - a.usageCount);

         // Fetch all PackagePromoCodes along with their corresponding CorporateCompany
         const promoCodePackage = await PackagePromoCode.findAll({
            include: [{ model: CorporateCompany }],
            where: {
               CorporateCompanyId: {
                  [Op.ne]: null,
               },
            },
         });

         const promoUsageByCorporate = {};

         // Iterate through each promo code
         for (const promoCode of promoCodePackage) {
            const { CorporateCompany: corporate, name } = promoCode;
            // Fetch usage count for the current promo code
            let usageCountPP = await UsedPromosPackages.count({
               where: {
                  PackagePromoCodeId: promoCode.id,
                  ClientPackageId: {
                     [Op.ne]: null,
                  },
                  createdAt: {
                     [Op.gte]: startDate.getTime(),
                     [Op.lte]: endDate.getTime(),
                  },
               },
            });
            if (promoUsageByCorporate[corporate.en_name]) {
               promoUsageByCorporate[corporate.en_name] += usageCountPP;
               continue;
            }
            promoUsageByCorporate[corporate.en_name] = usageCountPP;
         }
         // console.log(promoUsageByCorporate);

         return { promoUsageByCorporate, promoCodesUsageThisMonth };
      } catch (error) {
         console.error(
            "Error retrieving promo code usage by corporate:",
            error
         );
         throw error;
      }
   }
   async callGetRequests(url, isMap) {
      if (!url) return new AppError("Please send the url", 400);
      if (isMap) {
         url = url + `&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      }
      let response = await axios.get(url);
      // console.log(response);
      // response = JSON.stringify(response);
      // console.log(response);
      return response.data;
   }
}

function getMonthLastDay(month, year) {
   const monthsThirtyOne = [1, 3, 5, 7, 8, 10, 12];
   const monthsThirty = [4, 6, 9, 11];
   if (monthsThirtyOne.includes(month)) {
      return 31;
   } else if (monthsThirty.includes(month)) {
      return 30;
   } else if (year % 4 === 0) {
      return 29;
   } else {
      return 28;
   }
}

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/settings/${imageName}.jpg`;
   require("fs").writeFile(
      `.${filename}`,
      base64Image,
      "base64",
      function (err) {
         if (err) console.error(err);
      }
   );
   return filename;
};

const settingsService = new SettingsService();
module.exports = settingsService;
