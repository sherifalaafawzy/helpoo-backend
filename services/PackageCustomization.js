const PackageCustomization = require("../models/PackageCustomization");

const AppError = require("../utils/AppError");

class PackageCustomizations {
   async createCustomization(packageId, customization) {
      const packageCustomization = await PackageCustomization.findOne({
         where: {
            PackageId: packageId,
         },
      });
      if (packageCustomization) {
         throw new AppError(
            "Package already has a customization, Try to update",
            400
         );
      }
      let data = {
         PackageId: packageId,
         ...customization,
      };
      delete data.packageId;
      delete data.PhoneNumber;
      delete data.name;
      try {
         const newPackageCustomization = await PackageCustomization.create(
            data
         );
         return newPackageCustomization;
      } catch (e) {
         console.log(e);
         throw new AppError(e.message, 500);
      }
   }

   async updateCustomization(packageId, customization) {
      let packageCustomization = await PackageCustomization.findOne({
         where: {
            PackageId: packageId,
         },
      });
      if (!packageCustomization) {
         throw new AppError("Customization not found, create new one", 404);
      }
      await PackageCustomization.update(
         {
            ...customization,
         },
         {
            where: {
               PackageId: packageId,
            },
         }
      );
      packageCustomization = await PackageCustomization.findOne({
         where: {
            PackageId: packageId,
         },
      });
      return packageCustomization;
   }
   async getPackageCustomization(packageId) {
      let packageCustomization = await PackageCustomization.findOne({
         where: {
            PackageId: packageId,
         },
      });
      if (!packageCustomization) {
         return new AppError("Customization not found, create new one", 404);
      }
      packageCustomization = packageCustomization.get({ plain: true });
      return packageCustomization;
   }
   async getAllPackageCustomizations() {
      let packageCustomizations = await PackageCustomization.findAll();
      return packageCustomizations;
   }
}

const packageCustomization = new PackageCustomizations();

module.exports = packageCustomization;
