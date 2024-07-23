// NPM Lib
const log = require("npmlog");
const CorporateCompany = require("../models/CorporateCompany");
const sequelize = require("sequelize");
const { Op } = require("sequelize");

// Models
const Corporate = require("../models/Corporate");
const User = require("../models/User");
const ServiceRequest = require("../models/ServiceRequest");
const ClientPackage = require("../models/ClientPackage");
const Car = require("../models/Car");
const Client = require("../models/Client");
const Driver = require("../models/Driver");

// Utils
const AppError = require("../utils/AppError");

class CorporateCompanyService {
   async createCorporateCompany(data) {
      try {
         if (data.image) {
            data["photo"] = decodeImages(
               `${data.en_name.replaceAll(" ", "-")}-logo-${Date.now()}`,
               data.image
            );
         }

         const corporateCompany = await CorporateCompany.create(data);
         return corporateCompany;
      } catch (err) {
         log.error("Error", err);
         return new AppError(err.message, 400);
      }
   }

   async searchByName(name) {
      try {
         const corporates = await CorporateCompany.findAll({
            where: {
               [Op.or]: {
                  // en_name: {
                  //   [Op.substring]: name,
                  // },
                  // ar_name: {
                  //   [Op.substring]: name,
                  // },
                  en_name: { [Op.iLike]: `%${name}%` },
                  ar_name: { [Op.iLike]: `%${name}%` },
               },
            },
         });
         return corporates;
      } catch (err) {
         console.log(err);
         log.error(err);
         return new AppError(err.message, 500);
      }
   }
   async getCorporateByUserId(id) {
      const corporate = await Corporate.findOne({
         where: {
            UserId: id,
         },
      });
      if (!corporate) return new AppError("something went wrong!", 400);
      return corporate;
   }
   async updateCorporateCompany({ data, corporateCompanyId }) {
      let corp = await CorporateCompany.findByPk(corporateCompanyId);
      if (!corp) return new AppError("couldn't find this corp", 404);
      if (data.image) {
         let name = data.en_name ? data.en_name : corp.en_name;
         data["photo"] = decodeImages(
            `${name.replaceAll(" ", "-")}-logo-${Date.now()}`,
            data.image
         );
      }
      const updatedCorporateCompany = await CorporateCompany.update(
         {
            ...data,
         },
         {
            where: {
               id: corporateCompanyId,
            },
         }
      );
      if (!updatedCorporateCompany)
         return new AppError("Something went wrong", 400);
      return updatedCorporateCompany;
   }

   async getAllCorporates() {
      const corporates = await CorporateCompany.findAndCountAll({});
      if (!corporates) return new AppError("Couldn't find any corporates", 404);
      return corporates;
   }

   async getACorporate(corporateCompanyId) {
      let corporate = await CorporateCompany.findByPk(corporateCompanyId, {
         include: [{ model: Corporate, include: [User] }],
      });
      if (!corporate) return new AppError("Couldn't find this corporate", 404);
      corporate = corporate.get({ plain: true });
      return corporate;
   }

   async deleteCorporateCompany(corporateCompanyId) {
      const deletedCorporate = await CorporateCompany.update(
         {
            deferredPayment: false,
            discount_ratio: 0,
         },
         {
            where: {
               id: corporateCompanyId,
            },
         }
      );
      if (!deletedCorporate)
         return new AppError("Couldn't find this corporate", 400);
      const corporate = await CorporateCompany.findByPk(corporateCompanyId);
      return corporate;
   }
   // async getCorporateCompanyRequests(CorporateCompanyId) {
   //    try {
   //       const serviceRequests = await ServiceRequest.findAll({
   //          where: {
   //             CorporateCompanyId: CorporateCompanyId,
   //          },
   //          include: [
   //             {
   //                model: ClientPackage,
   //             },
   //             {
   //                model: CorporateCompany,
   //             },
   //             {
   //                model: Car,
   //             },
   //             {
   //                model: Client,
   //             },
   //             {
   //                model: Driver,
   //             },
   //          ],
   //       });
   //       return serviceRequests;
   //    } catch (error) {
   //       console.error(error);
   //       return new AppError(error.message, 400);
   //    }
   // }
   async deleteCorporate(corporateId) {
      const corporate = await Corporate.destroy({
         where: {
            id: corporateId,
         },
         cascade: true,
      });
      return corporate;
   }
   async getCorporatesInCC(id) {
      let corporates = await Corporate.findAll({
         where: {
            CorporateCompanyId: id,
         },
         include: [
            {
               model: User,
            },
         ],
      });
      corporates = corporates.map((corporate) =>
         corporate.get({ plain: true })
      );
      return corporates;
   }
}

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/corporates/${imageName}.jpg`;
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

const corporateCompanyService = new CorporateCompanyService();
module.exports = corporateCompanyService;
