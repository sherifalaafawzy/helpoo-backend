const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const CorporateCompany = db.define("CorporateCompany", {
   id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
   },
   en_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
   },
   ar_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
   },
   discount_ratio: {
      type: DataTypes.INTEGER,
      allowNull: false,
   },
   deferredPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   startDate: {
      type: DataTypes.DATE,
      // allowNull:false
   },
   endDate: {
      type: DataTypes.DATE,
      // allowNull:false
   },
   cash: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   cardToDriver: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
   photo: {
      type: DataTypes.STRING,
   },
   numofrequeststhismonth: {
      type: DataTypes.INTEGER,
   },
   applyDiscount: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
   },
});
db.sync();

module.exports = CorporateCompany;
