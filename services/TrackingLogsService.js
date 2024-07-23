const TrackingLogs = require("../models/TrackingLogs");
const AppError = require("../utils/AppError");
const monthlyTrackingLogsService = require("./MonthlyTrackingLogsService");

class TrackingLogsService {
   async getAll() {
      const targets = await TrackingLogs.findAll();
      return targets;
   }

   async getTrackingLog(id) {
      const checkExist = await TrackingLogs.findByPk(id);
      if (!checkExist) return new AppError("TrackingLog does not exist", 404);
      return checkExist;
   }

   async createTrackingLog(data) {
      try {
         if (data.requestId === 0) {
            data.requestId = undefined;
         }
         await monthlyTrackingLogsService.increaseMonthlyTrackingLog(
            data.from,
            data.api
         );
         const target = await TrackingLogs.create(data);
         return target;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateTrackingLog(id, data) {
      const checkExist = await TrackingLogs.findByPk(id);
      if (!checkExist) return new AppError("TrackingLog does not exist", 404);
      await TrackingLogs.update(data, {
         where: {
            id,
         },
      });
      const target = await TrackingLogs.findByPk(id);
      return target;
   }
   async deleteTrackingLog(id) {
      const checkExist = await TrackingLogs.findByPk(id);
      if (!checkExist) return new AppError("TrackingLog does not exist", 404);
      await TrackingLogs.destroy({ where: { id } });
      return "deleted";
   }
}
const trackingLogsService = new TrackingLogsService();
module.exports = trackingLogsService;
