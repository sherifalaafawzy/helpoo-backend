const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const MonthlyTrackingLogs = db.define(
   "MonthlyTrackingLogs",
   {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      from: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      api: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      count: {
         type: DataTypes.INTEGER,
         defaultValue: 0,
      },
      month: {
         type: DataTypes.INTEGER,
      },
   },
   {
      timestamps: true,
   }
);

MonthlyTrackingLogs.sync();
module.exports = MonthlyTrackingLogs;
