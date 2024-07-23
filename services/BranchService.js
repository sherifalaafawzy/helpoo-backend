const Branch = require("../models/Branches");
const AppError = require("../utils/AppError");

const corporateCompanyService = require("./CorporateCompanyService");
class BranchServices {
   async createBranch(body) {
      if (!body.name || !body.CorporateCompanyId) {
         return new AppError("Please provide a name and company ID", 400);
      }
      const checkCorp = await corporateCompanyService.getACorporate(
         body.CorporateCompanyId
      );
      if (checkCorp.statusCode) {
         return new AppError("Corporate company Id is not valid", 400);
      }
      const newBranch = await Branch.create(body);
      return newBranch;
   }
   async getAllBranchesForCompany(companyId) {
      const branches = await Branch.findAll({
         where: {
            CorporateCompanyId: companyId,
         },
      });
      return branches;
   }
   async getBranch(id) {
      const branch = await Branch.findByPk(id);
      if (!branch) {
         return new AppError("Couldn't find branch", 404);
      }
      return branch;
   }
   async deleteBranch(id) {
      const branch = await Branch.destroy({
         where: {
            id,
         },
      });
      return branch;
   }
   async updateBranch(id, name, phoneNumber, address) {
      if (!name || !phoneNumber || !address) {
         return new AppError("Please provide a valid update data", 400);
      }
      const checkExist = await Branch.findByPk(id);
      if (!checkExist) {
         return new AppError("Couldn't find branch", 404);
      }
      let updateValues = {};
      if (name) {
         updateValues["name"] = name;
      }
      if (phoneNumber) {
         updateValues["phoneNumber"] = phoneNumber;
      }
      if (address) {
         updateValues["address"] = address;
      }
      await Branch.update(
         {
            ...updateValues,
         },
         {
            where: { id },
         }
      );
      const branch = await Branch.findByPk(id);
      return branch;
   }
}

const branchServices = new BranchServices();
module.exports = branchServices;
