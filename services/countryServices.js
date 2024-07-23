const Cities = require("../models/Cities");
const Districts = require("../models/Districts");
const AppError = require("../utils/AppError");

class Country {
   async getAllCities() {
      return await Cities.findAll();
   }
   async getAllDistrict() {
      return await Districts.findAll();
   }
   async getDistrictsByCity(CityId) {
      return await Districts.findAll({
         where: {
            CityId,
         },
      });
   }
}

const country = new Country();
module.exports = country;
