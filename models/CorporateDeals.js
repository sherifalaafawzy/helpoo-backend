const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const CorporateDeals = db.define("CorporateDeals", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   discountPercent: {
      type: DataTypes.INTEGER,
      validate: {
         min: {
            args: 1,
            msg: "Please enter a number with a minimum value of 1",
         },
         max: {
            args: 100,
            msg: "Please enter a number with a maximum value of 100",
         },
      },
   },
   discountFees: {
      type: DataTypes.INTEGER,
      validate: {
         min: {
            args: 1,
            msg: "Please enter a number with a minimum value of 1",
         },
      },
   },
   PackageId: {
      type: DataTypes.INTEGER,
      references: {
         model: "Packages",
      },
   },
   CorporateCompanyId: {
      type: DataTypes.INTEGER,
      references: {
         model: "CorporateCompanies",
      },
   },
   expiryDate: {
      type: DataTypes.DATE,
      allowNull: false,
   },
   name: {
      type: DataTypes.STRING,
      trim: true,
   },
});
CorporateDeals.sync();
module.exports = CorporateDeals;
