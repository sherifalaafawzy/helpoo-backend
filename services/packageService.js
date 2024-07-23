// Models
const Package = require("../models/Package");
const AppError = require("../utils/AppError");
const PackageBenefits = require("../models/PackageBenefits");
const InsuranceCompany = require("../models/InsuranceCompany");
const PackageCustomization = require("../models/PackageCustomization");
const Broker = require("../models/Broker");
const User = require("../models/User");
const CorporateCompany = require("../models/CorporateCompany");
const PackageTransactions = require("../models/PackageTransactions");

class PackageService {
   async getOnePackage(packageId) {
      const existPackage = await Package.findOne({
         where: {
            id: packageId,
         },
         include: [
            {
               model: PackageBenefits,
               order: [["id", "ASC"]],
            },
            {
               model: InsuranceCompany,
            },
            {
               model: PackageCustomization,
            },
            {
               model: CorporateCompany,
            },
            { model: Broker },
         ],
      });
      if (!existPackage) return new AppError("No package with this id", 404);
      else {
         return existPackage;
      }
   }
   async packageTransactions(userId) {
      let packageTransactions = await PackageTransactions.findAll({
         where: {
            UserId: userId,
         },
      });
      return packageTransactions;
   }

   async updatePackage(id, data) {
      try {
         let existPackage = await this.getOnePackage(id);
         if (!existPackage || existPackage.statusCode)
            throw new AppError("No package with this id", 404);
         if (data.photo64) {
            data["photo"] = decodeImages(
               `${
                  data.enName ? data.enName : existPackage.enName
               }-${Date.now()}`,
               data.photo64
            );
         }
         const updatePackage = await Package.update(data, {
            where: {
               id,
            },
         });
         if (data.benefits) {
            let benefits = data.benefits;
            benefits = benefits.map((benefit) => {
               return {
                  ...benefit,
                  packageId: existPackage.id,
               };
            });
            for (let i = 0; i < benefits.length; i++) {
               if (benefits[i].id) {
                  await PackageBenefits.update(benefits[i], {
                     where: {
                        id: benefits[i].id,
                     },
                  });
               } else {
                  await PackageBenefits.create(benefits[i]);
               }
            }
         }
         existPackage = await this.getOnePackage(id);
         return existPackage;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }
   async createPackage(data) {
      try {
         if (!data.enName) throw new AppError("No package name provided", 400);
         if (data.photo64) {
            data["photo"] = decodeImages(
               `${data.enName}-${Date.now()}`,
               data.photo64
            );
         }
         const newPackage = await Package.create({
            ...data,
         });
         let benefits = data.benefits;
         let packageBenefits = null;
         if (benefits) {
            benefits = benefits.map((benefit) => {
               return {
                  ...benefit,
                  packageId: newPackage.id,
               };
            });
            packageBenefits = await PackageBenefits.bulkCreate(benefits);
         }
         return {
            newPackage,
            packageBenefits,
         };
      } catch (err) {
         console.error(err);
         throw new AppError(err.errors[0].message, 500);
      }
   }

   async getAllPackages(
      isPublic,
      insuranceCompanyId,
      corprateCompanyId,
      BrokerId
   ) {
      try {
         let where = isPublic
            ? {
                 private: false,
              }
            : {};
         if (insuranceCompanyId) {
            where["insuranceCompanyId"] = insuranceCompanyId;
         }
         if (corprateCompanyId) {
            where["corporateCompanyId"] = corprateCompanyId;
         }
         if (BrokerId) {
            where["BrokerId"] = BrokerId;
         }
         let packages = await Package.findAll({
            where,
            include: [
               {
                  model: PackageBenefits,
                  order: [["id", "DESC"]],
               },
               {
                  model: InsuranceCompany,
               },
               {
                  model: PackageCustomization,
               },
               {
                  model: CorporateCompany,
               },
               {
                  model: Broker,
                  include: {
                     model: User,
                  },
               },
            ],
         });
         packages.forEach((pkg) => {
            pkg.PackageBenefits.sort((a, b) => {
               // Replace 'fieldName' with the actual field you want to sort by
               if (a.id < b.id) return -1;
               if (a.id > b.id) return 1;
               return 0;
            });
         });
         return packages;
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async deletePackage(id) {
      let existPackage = await Package.findByPk(id);
      if (!existPackage) return new AppError("No package with this id", 404);
      return await existPackage.update({
         active: false,
      });
   }
   async findPackageByInsuranceId(insuranceId) {
      let existPackage = await Package.findOne({
         where: {
            insuranceCompanyId: insuranceId,
         },
      });
      if (!existPackage) return new AppError("No package with this id", 404);
      return existPackage;
   }
   async togglePackage(id) {
      let existPackage = await Package.findByPk(id);
      if (!existPackage) return new AppError("No package with this id", 404);
      return await existPackage.update({
         active: !existPackage.active,
      });
   }
}

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/packages/imgs/${imageName}.png`;
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

const packageService = new PackageService();
module.exports = packageService;
