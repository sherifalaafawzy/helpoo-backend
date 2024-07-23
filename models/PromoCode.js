const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");
const PromoCodeUser = require("./PromoCodeUser");
const User = require("./User");

const PromoCode = db.define(
   "PromoCode",
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
         allowNull: false,
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
      feesDiscount: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      maxFeesDiscount: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      maxUse: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      private: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
         allowNull: false,
      },
      voucher: {
         type: DataTypes.BOOLEAN,
         defaultValue: false,
      },
      active: {
         type: DataTypes.BOOLEAN,
         defaultValue: true,
      },
   },
   {
      indexes: [
         {
            unique: false,
            fields: ["value"],
         },
      ],
   }
);

PromoCode.belongsToMany(User, { through: PromoCodeUser });
User.belongsToMany(PromoCode, { through: PromoCodeUser });

PromoCode.sync();

module.exports = PromoCode;
