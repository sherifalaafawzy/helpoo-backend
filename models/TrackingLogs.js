const { DataTypes } = require("sequelize");
const db = require("../loaders/sequelize");

const TrackingLogs = db.define(
   "TrackingLogs",
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
      requestId: {
         type: DataTypes.INTEGER,
         references: {
            model: "ServiceRequests",
         },
      },
   },
   {
      timestamps: true,
   }
);

TrackingLogs.sync();
module.exports = TrackingLogs;
