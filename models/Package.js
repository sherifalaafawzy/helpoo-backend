const { DataTypes } = require("sequelize");

const db = require("../loaders/sequelize");
const InsuranceCompany = require("./InsuranceCompany");
const Broker = require("./Broker");
const CorporateCompany = require("./CorporateCompany");

const Package = db.define("Package", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   enName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
   },
   arName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
   },
   originalFees: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   price: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   fees: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   numberOfCars: {
      type: DataTypes.INTEGER,
      allowNull: true,
   },
   maxDiscountPerTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   numberOfDiscountTimes: {
      type: DataTypes.INTEGER,
   },
   numberOfDiscountTimesOther: {
      type: DataTypes.INTEGER,
   },
   discountPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   discountAfterMaxTimes: {
      type: DataTypes.INTEGER,
   },
   numberOfDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   arDescription: {
      type: DataTypes.STRING,
      allowNull: false,
   },
   enDescription: {
      type: DataTypes.STRING,
      allowNull: false,
   },
   active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
   },
   private: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
   },
   activateAfterDays: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
   },
   photo: {
      type: DataTypes.STRING,
   },
});

Package.belongsTo(InsuranceCompany, {
   foreignKey: "insuranceCompanyId",
   allowNull: true,
});
Package.belongsTo(Broker, {
   foreignKey: "BrokerId",
   allowNull: true,
});
Package.belongsTo(CorporateCompany, {
   foreignKey: "corporateCompanyId",
   allowNull: true,
});

Package.sync();

module.exports = Package;
