// NPM Lib
const { Op } = require("sequelize");

// Models
const insuranceCompanyModel = require("../models/InsuranceCompany");
const InsuranceModel = require("../models/Insurance");

// Utils
const AppError = require("../utils/AppError");

class InsuranceCompany {
   async listInsuranceCompanies() {
      const listInsuranceCompanies = await insuranceCompanyModel.findAll({});
      return listInsuranceCompanies;
   }
   async listContractedInsuranceCompanies() {
      const insuranceCompanies = await insuranceCompanyModel.findAll({
         where: {
            contracted: true,
         },
      });
      return insuranceCompanies;
   }

   async createInsurance(data) {
      try {
         const existInsurance = await insuranceCompanyModel.findOne({
            where: {
               [Op.or]: [
                  {
                     ar_name: {
                        [Op.like]: `%${data.ar_name}%`,
                     },
                  },
                  {
                     en_name: {
                        [Op.like]: `%${data.en_name}%`,
                     },
                  },
               ],
            },
         });
         if (existInsurance) {
            return new AppError("This Insurance Company already exists", 400);
         } else {
            if (data.image) {
               data["photo"] = decodeImages(
                  `${data.en_name.replaceAll(" ", "-")}-logo-${Date.now()}`,
                  data.image
               );
            }
            const newInsurance = await insuranceCompanyModel.create(data);
            return newInsurance;
         }
      } catch (err) {
         console.error(err);
         return new AppError(err.message, 400);
      }
   }

   async updateInsurance({ data, insuranceCompanyId }) {
      let insuranceCompany = await insuranceCompanyModel.findByPk(
         insuranceCompanyId
      );
      if (!insuranceCompany) {
         return new AppError("Insurance Company not found", 404);
      }
      if (data.image) {
         let name = data.en_name ? data.en_name : insuranceCompany.en_name;
         data["photo"] = decodeImages(
            `${name.replaceAll(" ", "-")}-logo-${Date.now()}`,
            data.image
         );
      }
      const insurance = await insuranceCompanyModel.update(
         {
            ...data,
         },
         {
            where: {
               id: insuranceCompanyId,
            },
         }
      );
      if (!insurance) return new AppError("Something went wrong!", 400);
      return insurance;
   }

   async getInsurance(insuranceCompanyId) {
      let insurance = await insuranceCompanyModel.findByPk(insuranceCompanyId);
      if (!insurance) return new AppError("Could't find this company", 400);
      insurance = insurance.get({ plain: true });
      return insurance;
   }
   // async deleteInsurance(insuranceCompanyId){
   //
   // }
   async getInsuranceByUserId(id) {
      try {
         const insurance = await InsuranceModel.findOne({
            where: {
               UserId: id,
            },
         });
         return insurance;
      } catch (err) {
         console.error(err);
      }
   }

   async deleteInsurance(insuranceCompanyId) {
      try {
         const insurance = await InsuranceModel.destroy({
            where: {
               id: insuranceCompanyId,
            },
            cascade: true,
         });
         return insurance;
      } catch (err) {
         console.error(err);
      }
   }
}

const decodeImages = (imageName, image) => {
   const base64Image = image.split(";base64,").pop();
   let filename = `/public/insuranceCompanies/${imageName}.png`;
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

const insuranceCompany = new InsuranceCompany();
module.exports = insuranceCompany;
