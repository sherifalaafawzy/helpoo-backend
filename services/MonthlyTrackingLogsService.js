const MonthlyTrackingLogs = require("../models/MonthlyTrackingLogs");
const AppError = require("../utils/AppError");

class MonthlyTrackingLogsService {
   async increaseMonthlyTrackingLog(from, api) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      let checkIfExist = await MonthlyTrackingLogs.findOne({
         where: {
            month: currentMonth,
            from,
            api,
         },
      });
      if (checkIfExist) {
         await MonthlyTrackingLogs.update(
            {
               count: checkIfExist.count + 1,
            },
            {
               where: {
                  id: checkIfExist.id,
               },
            }
         );
         return 0;
      } else {
         await MonthlyTrackingLogs.create({
            from,
            api,
            month: currentMonth,
            count: 1,
         });
         return 0;
      }
   }
}

const monthlyTrackingLogsService = new MonthlyTrackingLogsService();
module.exports = monthlyTrackingLogsService;
