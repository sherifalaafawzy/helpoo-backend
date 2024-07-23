const { DataTypes } = require("sequelize");
const User = require("./User");
const db = require("../loaders/sequelize");
const CorporateCompany = require("./CorporateCompany");

const PackagePromoCode = db.define(
   "PackagePromoCode",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         allowNull: false,
         primaryKey: true,
      },
      name: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      value: {
         type: DataTypes.STRING,
         allowNull: false,
         unique: true,
      },
      startDate: {
         type: DataTypes.DATE,
         allowNull: false,
      },
      expiryDate: {
         type: DataTypes.DATE,
         allowNull: false,
      },
      usageExpiryDate: {
         type: DataTypes.DATE,
         allowNull: false,
      },
      percentage: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      count: {
         type: DataTypes.INTEGER,
         allowNull: false,
         defaultValue: 0,
      },
      maxCount: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      maxUse: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      feesDiscount: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      private: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
         allowNull: false,
      },
      active: {
         type: DataTypes.BOOLEAN,
         defaultValue: true,
      },
      SMS: {
         type: DataTypes.STRING,
      },
      ENSMS: {
         type: DataTypes.STRING,
      },
      ActivateSMS: {
         type: DataTypes.STRING,
      },
      ActivateENSMS: {
         type: DataTypes.STRING,
      },
   },
   {
      // indexes: [
      //    {
      //       unique: false,
      //       fields: ["value"],
      //       name: "value",
      //    },
      // ],
   }
);
User.belongsTo(PackagePromoCode);
PackagePromoCode.belongsTo(CorporateCompany);
PackagePromoCode.sync();

module.exports = PackagePromoCode;
