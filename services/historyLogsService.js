const { Op } = require("sequelize");
const sequelize = require("sequelize");
const moment = require("moment");
const HistoryLogs = require("../models/historyLogs");
const AppError = require("../utils/AppError");
const User = require("../models/User");
const Roles = require("../models/Roles");

class HistoryLogsServices {
   async getAll(page = 1, limit = 10) {
      const logs = await HistoryLogs.findAll({
         limit,
         order: [["id", "DESC"]],
         offset: (page - 1) * limit,
      });
      return logs;
   }
   async getOne(id) {
      const logs = await HistoryLogs.findByPk(id);
      if (!logs) throw new AppError("No logs found with this id", 404);
      else return logs;
   }

   async getForUser(userId, page = 1, limit = 10) {
      const logs = await HistoryLogs.findAll({
         where: {
            UserId: userId,
         },
         limit,
         order: [["id", "DESC"]],
         offset: (page - 1) * limit,
      });
      return logs;
   }
   async getByDate(date, page = 1, limit = 10) {
      const logs = await HistoryLogs.findAll({
         where: {
            createdAt: { [Op.gte]: new Date(date).getTime() },
         },
         limit,
         order: [["id", "DESC"]],
         offset: (page - 1) * limit,
      });

      return logs;
   }

   async getByString(part, page = 1, limit = 10) {
      const logs = await HistoryLogs.findAll({
         where: {
            API: {
               [Op.iLike]: `%${part}%`,
            },
         },
         order: [["id", "DESC"]],
         limit,
         offset: (page - 1) * limit,
      });
      return logs;
   }

   async countApiUsageByTopUsers(apiName, from, to) {
      try {
         let where = {};
         if (from && to) {
            let startDate = moment(from).subtract(1, "h");
            let endDate = moment(to).add(1, "d").subtract(1, "h");

            where["createdAt"] = {
               [Op.between]: [startDate, endDate],
            };
         } else if (from) {
            let startDate = moment(from).subtract(1, "h");

            where["createdAt"] = {
               [Op.gte]: startDate,
            };
         } else if (to) {
            let endDate = moment(to).add(1, "d").subtract(1, "h");

            where["createdAt"] = {
               [Op.lte]: endDate,
            };
         }
         const result = await HistoryLogs.findAll({
            attributes: [
               "UserId",
               [sequelize.fn("COUNT", sequelize.col("UserId")), "usageCount"],
            ],
            where: {
               API: {
                  [Op.iLike]: `%${apiName}%`,
               },
               ...where,
            },
            group: ["UserId", "User.id", "User->Role.id"],
            order: [[sequelize.fn("COUNT", sequelize.col("UserId")), "DESC"]],
            include: [{ model: User, include: [Roles] }],
         });
         return result;
      } catch (error) {
         console.error("Error counting API usage:", error);
         throw error;
      }
   }
}

const historyLogsServices = new HistoryLogsServices();
module.exports = historyLogsServices;
