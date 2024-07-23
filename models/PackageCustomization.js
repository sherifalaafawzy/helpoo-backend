const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");
const Package = require("./Package");
const PackageCustomization = db.define("PackageCustomization", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   name: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   PhoneNumber: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   year: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   CarBrand: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   CarModel: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   color: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   Vin_number: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   PolicyNumber: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   PolicyStartDate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   PolicyEndDate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   CarPlate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
   },
   insuranceCompanyId: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
});
PackageCustomization.belongsTo(Package, { allowNull: true });
Package.hasMany(PackageCustomization);

PackageCustomization.sync();

module.exports = PackageCustomization;
