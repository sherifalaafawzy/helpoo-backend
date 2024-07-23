const Corporate = require("../models/Corporate");
const CorporateCompany = require("../models/CorporateCompany");
const User = require("../models/User");
class CorporateService {
   async getUserCompany(corporateId) {
      const corporate = await Corporate.findOne({
         where: {
            id: corporateId,
         },
         include: [
            {
               model: CorporateCompany,
            },
            {
               model: User,
            },
         ],
      });
      return corporate;
   }
   async getUserCompanyByUserId(userId) {
      const corporate = await Corporate.findOne({
         where: {
            UserId: userId,
         },
         include: [
            {
               model: CorporateCompany,
            },
            {
               model: User,
            },
         ],
      });
      return corporate;
   }
}

const corporateService = new CorporateService();
module.exports = corporateService;
